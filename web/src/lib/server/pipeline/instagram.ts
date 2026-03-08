import { ClaudeClient } from "./llm";
import {
  CAPTION_PROMPT,
  CAPTION_SYSTEM,
  FALLBACK_HASHTAGS,
  HASHTAG_PROMPT,
  HASHTAG_SYSTEM,
} from "./prompts";
import type { PipelineConfig } from "./config";
import { Database } from "./db";
import {
  ContentStatus,
  SoftwareCategory,
  type ContentItem,
  type InstagramPost,
  type Video,
} from "./models";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function generateHashtags(
  llm: ClaudeClient,
  category: SoftwareCategory,
  hook: string,
  script: string,
): Promise<string[]> {
  try {
    const tags = await llm.chatJson(
      HASHTAG_SYSTEM,
      HASHTAG_PROMPT.replace("{category}", category)
        .replace("{hook}", hook)
        .replace("{script}", script),
    );
    if (isStringArray(tags)) {
      return tags;
    }
  } catch {
  }

  return FALLBACK_HASHTAGS[category] ?? FALLBACK_HASHTAGS[SoftwareCategory.PROJECT_MANAGEMENT];
}

export class InstagramAgent {
  private readonly config: PipelineConfig;
  private readonly db: Database;
  private readonly llm: ClaudeClient;

  constructor(config: PipelineConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.llm = new ClaudeClient(this.config.anthropic_api_key);
  }

  async post(video: Video, content: ContentItem): Promise<InstagramPost> {
    if (video.id == null || content.id == null) {
      throw new Error("Video and content IDs are required for Instagram posting");
    }

    const caption = await this.llm.chat(
      CAPTION_SYSTEM,
      CAPTION_PROMPT.replace("{category}", content.category)
        .replace("{hook}", content.hook)
        .replace("{script}", content.script)
        .replace("{cta}", content.cta),
    );

    const hashtags = await generateHashtags(this.llm, content.category, content.hook, content.script);
    const hashtagStr = hashtags.slice(0, 25).map((tag) => `#${tag}`).join(" ");
    const fullCaption = `${caption}\n\n${hashtagStr}`;

    const mediaId = await this._publishReel(video, fullCaption);
    const post: InstagramPost = {
      video_id: video.id,
      instagram_media_id: mediaId,
      caption: fullCaption,
      hashtags,
      posted_at: new Date().toISOString(),
    };

    post.id = this.db.insert_instagram_post(post);
    this.db.update_content_status(content.id, ContentStatus.POSTED_INSTAGRAM);
    this.db.log_action(content.id, "InstagramAgent", "posted_reel", {
      postId: post.id,
      mediaId,
    });

    try {
      await this._publishStory(video);
    } catch (error) {
      console.log("[pipeline] Story posting failed", error);
    }

    return post;
  }

  private async _publishReel(video: Video, caption: string): Promise<string> {
    const videoUrl = `${this.config.public_video_host}/media/videos/content_${video.content_id}.mp4`;
    const containerId = await this.createContainer({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
    });

    await this._waitForContainer(containerId);

    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: this.config.instagram_access_token,
    });

    const publishResponse = await fetch(
      `https://graph.facebook.com/${this.config.graph_api_version}/${this.config.instagram_user_id}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishParams,
      },
    );
    const publishBody = (await publishResponse.json()) as unknown;
    if (!publishResponse.ok) {
      throw new Error(`Instagram publish failed (${publishResponse.status}): ${JSON.stringify(publishBody)}`);
    }

    if (typeof publishBody !== "object" || publishBody === null || !("id" in publishBody)) {
      throw new Error("Instagram publish response missing media id");
    }
    const idValue = publishBody.id;
    if (typeof idValue !== "string") {
      throw new Error("Instagram publish response id is not a string");
    }
    return idValue;
  }

  private async _waitForContainer(containerId: string, timeoutSeconds = 300): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutSeconds * 1000) {
      const statusUrl = new URL(
        `https://graph.facebook.com/${this.config.graph_api_version}/${containerId}`,
      );
      statusUrl.searchParams.set("fields", "status_code,status");
      statusUrl.searchParams.set("access_token", this.config.instagram_access_token);

      const response = await fetch(statusUrl);
      const body = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(
          `Instagram container status failed (${response.status}): ${JSON.stringify(body)}`,
        );
      }

      const statusCode =
        typeof body === "object" && body !== null && "status_code" in body
          ? body.status_code
          : null;
      if (statusCode === "FINISHED") {
        return;
      }
      if (statusCode === "ERROR") {
        const statusMessage =
          typeof body === "object" && body !== null && "status" in body && typeof body.status === "string"
            ? body.status
            : "unknown error";
        throw new Error(`Instagram container ${containerId} failed: ${statusMessage}`);
      }
      await sleep(10_000);
    }
    throw new Error(`Instagram container ${containerId} timed out`);
  }

  private async _publishStory(video: Video): Promise<string> {
    const videoUrl = `${this.config.public_video_host}/media/videos/content_${video.content_id}.mp4`;
    const containerId = await this.createContainer({
      media_type: "STORIES",
      video_url: videoUrl,
    });

    await this._waitForContainer(containerId);

    const publishParams = new URLSearchParams({
      creation_id: containerId,
      access_token: this.config.instagram_access_token,
    });

    const response = await fetch(
      `https://graph.facebook.com/${this.config.graph_api_version}/${this.config.instagram_user_id}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: publishParams,
      },
    );
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new Error(`Story publish failed (${response.status}): ${JSON.stringify(body)}`);
    }
    if (typeof body !== "object" || body === null || !("id" in body) || typeof body.id !== "string") {
      throw new Error("Story publish response missing media id");
    }
    return body.id;
  }

  private async createContainer(payload: Record<string, string>): Promise<string> {
    const params = new URLSearchParams({
      ...payload,
      access_token: this.config.instagram_access_token,
    });

    const response = await fetch(
      `https://graph.facebook.com/${this.config.graph_api_version}/${this.config.instagram_user_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      },
    );
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new Error(`Instagram container creation failed (${response.status}): ${JSON.stringify(body)}`);
    }

    if (typeof body !== "object" || body === null || !("id" in body) || typeof body.id !== "string") {
      throw new Error("Instagram container response missing id");
    }
    return body.id;
  }
}
