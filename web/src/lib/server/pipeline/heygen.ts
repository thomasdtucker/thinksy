const HEYGEN_API_BASE = "https://api.heygen.com";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type GenerateVideoResult = {
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
};

type RetryableError = Error & { retryable?: boolean };

type HeyGenClientOptions = {
  apiKey: string;
  avatarId: string;
  voiceId: string;
  avatarScale?: number;
  videoWidth?: number;
  videoHeight?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonSafe(response: Response): Promise<JsonValue | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNestedString(obj: unknown, ...keys: string[]): string | null {
  let current: unknown = obj;
  for (const key of keys) {
    if (!isRecord(current) || !(key in current)) {
      return null;
    }
    current = current[key];
  }
  return typeof current === "string" ? current : null;
}

export class HeyGenClient {
  private readonly apiKey: string;
  private readonly avatarId: string;
  private readonly voiceId: string;
  private readonly avatarScale: number;
  private readonly videoWidth: number;
  private readonly videoHeight: number;

  constructor(options: HeyGenClientOptions) {
    this.apiKey = options.apiKey.trim();
    this.avatarId = options.avatarId;
    this.voiceId = options.voiceId;
    this.avatarScale = options.avatarScale ?? 1;
    this.videoWidth = options.videoWidth ?? 0;
    this.videoHeight = options.videoHeight ?? 0;
  }

  async generateVideo(
    script: string,
    title = "",
    lookIds: string[] = [],
    variationIndex = 0,
  ): Promise<GenerateVideoResult> {
    return this.withRetry(async () => {
      const avatarId = lookIds.length > 0 ? lookIds[variationIndex % lookIds.length] : this.avatarId;
      const payload: Record<string, unknown> = {
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
              scale: this.avatarScale,
            },
            voice: {
              type: "text",
              voice_id: this.voiceId,
              input_text: script,
            },
          },
        ],
      };

      if (this.videoWidth > 0 && this.videoHeight > 0) {
        payload.dimension = { width: this.videoWidth, height: this.videoHeight };
      }
      if (title) {
        payload.title = title;
      }

      const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      await this._checkResponse(response);

      const body = (await response.json()) as unknown;
      const videoId = readNestedString(body, "data", "video_id");
      if (!videoId) {
        throw new Error("HeyGen response missing data.video_id");
      }

      const { videoUrl, thumbnailUrl } = await this._pollVideo(videoId);
      return { videoId, videoUrl, thumbnailUrl };
    });
  }

  async generateVideoAgent(
    prompt: string,
    avatarId?: string,
    orientation = "portrait",
    durationSec?: number,
  ): Promise<GenerateVideoResult> {
    return this.withRetry(async () => {
      const config: Record<string, unknown> = { orientation };
      if (avatarId) {
        config.avatar_id = avatarId;
      }
      if (durationSec) {
        config.duration_sec = durationSec;
      }

      const response = await fetch(`${HEYGEN_API_BASE}/v1/video_agent/generate`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ prompt, config }),
      });
      await this._checkResponse(response);

      const body = (await response.json()) as unknown;
      const videoId = readNestedString(body, "data", "video_id");
      if (!videoId) {
        throw new Error("HeyGen response missing data.video_id");
      }

      const { videoUrl, thumbnailUrl } = await this._pollVideo(videoId, 900);
      return { videoId, videoUrl, thumbnailUrl };
    });
  }

  async generateAvatarImage(
    groupId: string,
    prompt: string,
    pose = "half_body",
    orientation = "vertical",
    style = "Realistic",
  ): Promise<string> {
    return this.withRetry(async () => {
      const normalizedPrompt = prompt.toLowerCase().includes("avatar") ? prompt : `avatar ${prompt}`;
      const response = await fetch(`${HEYGEN_API_BASE}/v2/photo_avatar/look/generate`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          group_id: groupId,
          prompt: normalizedPrompt,
          pose,
          orientation,
          style,
        }),
      });
      await this._checkResponse(response);

      const body = (await response.json()) as unknown;
      const generationId = readNestedString(body, "data", "generation_id");
      if (!generationId) {
        throw new Error("HeyGen response missing data.generation_id");
      }

      return this._pollAvatarGeneration(generationId);
    });
  }

  private headers(): Record<string, string> {
    return {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  private async withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt += 1;
        const retryable = this.isRetryableError(error);
        if (!retryable || attempt >= maxAttempts) {
          throw error;
        }
        const backoffMs = 1000 * 2 ** (attempt - 1);
        await sleep(backoffMs);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unknown retry failure");
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const tagged = error as RetryableError;
    if (tagged.retryable === true) {
      return true;
    }
    if (error.name === "AbortError") {
      return true;
    }
    return /ECONNRESET|ENOTFOUND|ETIMEDOUT|fetch failed/i.test(error.message);
  }

  private async _checkResponse(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    const detail = await parseJsonSafe(response);
    const detailText = typeof detail === "string" ? detail : JSON.stringify(detail);

    if (response.status === 401) {
      throw new Error(
        "HeyGen API key rejected (401). Check HEYGEN_API_KEY in your .env - look for extra spaces or quotes.",
      );
    }
    if (response.status === 403) {
      throw new Error(
        "HeyGen API key does not have permission for this action (403). Check that your plan supports avatar video generation.",
      );
    }
    if (response.status === 404) {
      throw new Error(
        "HeyGen returned 404 - avatar ID not found. Check HEYGEN_AVATAR_ID / HEYGEN_AVATAR_LOOK_IDS in your .env. Use the UUID from HeyGen > Avatars, not a display name.",
      );
    }
    if (response.status === 422) {
      throw new Error(`HeyGen rejected the request (422): ${detailText}`);
    }
    if (response.status === 429) {
      throw new Error("HeyGen rate limit reached (429). Wait a moment and try again.");
    }
    if (response.status >= 500) {
      const error = new Error(
        `HeyGen server error (${response.status}): ${detailText || response.statusText}`,
      ) as RetryableError;
      error.retryable = true;
      throw error;
    }

    throw new Error(`HeyGen request failed (${response.status}): ${detailText || response.statusText}`);
  }

  private async _pollVideo(
    videoId: string,
    timeoutSeconds = 600,
  ): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutSeconds * 1000) {
      const url = new URL(`${HEYGEN_API_BASE}/v1/video_status.get`);
      url.searchParams.set("video_id", videoId);
      const response = await fetch(url, { headers: this.headers() });
      await this._checkResponse(response);

      const body = (await response.json()) as unknown;
      const status = readNestedString(body, "data", "status");
      if (status === "completed") {
        const videoUrl = readNestedString(body, "data", "video_url");
        if (!videoUrl) {
          throw new Error(`HeyGen completed video ${videoId} without video_url`);
        }
        return {
          videoUrl,
          thumbnailUrl: readNestedString(body, "data", "thumbnail_url"),
        };
      }

      if (status === "failed") {
        const errorCode = readNestedString(body, "data", "error", "code") ?? "";
        const errorMessage =
          readNestedString(body, "data", "error", "message") ??
          readNestedString(body, "data", "error", "detail") ??
          "Unknown error";

        if (errorCode.includes("INSUFFICIENT_CREDIT") || errorMessage.toLowerCase().includes("credit")) {
          throw new Error(
            "HeyGen has insufficient credits. Top up at https://app.heygen.com/settings?tab=billing",
          );
        }
        throw new Error(`HeyGen video generation failed: ${errorMessage}`);
      }

      await sleep(10_000);
    }

    throw new Error(`HeyGen video ${videoId} timed out after ${timeoutSeconds}s`);
  }

  private async _pollAvatarGeneration(generationId: string, timeoutSeconds = 300): Promise<string> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutSeconds * 1000) {
      const response = await fetch(`${HEYGEN_API_BASE}/v2/photo_avatar/generation/${generationId}`, {
        headers: this.headers(),
      });
      await this._checkResponse(response);

      const body = (await response.json()) as unknown;
      const status = readNestedString(body, "data", "status");
      if (status === "success") {
        const imageUrl = readNestedString(body, "data", "image_url");
        if (!imageUrl) {
          throw new Error(`Avatar image generation ${generationId} finished without image_url`);
        }
        return imageUrl;
      }
      if (status === "failed") {
        throw new Error(`Avatar image generation ${generationId} failed`);
      }

      await sleep(5_000);
    }

    throw new Error(`Avatar image generation ${generationId} timed out after ${timeoutSeconds}s`);
  }
}
