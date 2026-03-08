import fs from "node:fs";
import path from "node:path";

import type { PipelineConfig } from "./config";
import { Database } from "./db";
import { HeyGenClient } from "./heygen";
import { ContentStatus, type ContentItem, type Video } from "./models";

export const OUTFITS = [
  "a tan blazer",
  "a white blouse",
  "a green blazer",
  "a tan cardigan",
  "a white blazer",
  "a green blouse",
];

function ensureDirectory(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function downloadFile(url: string, destDir: string, filename: string): Promise<string> {
  const repoRoot = path.join(process.cwd(), "..");
  const resolvedDir = path.isAbsolute(destDir) ? destDir : path.join(repoRoot, destDir);
  ensureDirectory(resolvedDir);
  const filePath = path.join(resolvedDir, filename);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, bytes);
  return filePath;
}

export class VideoProducerAgent {
  private readonly config: PipelineConfig;
  private readonly db: Database;
  private readonly heygen: HeyGenClient;
  private readonly lookIds: string[];
  private variationIndex = 0;

  constructor(config: PipelineConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.lookIds = this.config.avatar_look_id_list();
    this.heygen = new HeyGenClient({
      apiKey: this.config.heygen_api_key,
      avatarId: this.config.heygen_avatar_id,
      voiceId: this.config.heygen_voice_id,
      avatarScale: this.config.heygen_avatar_scale,
      videoWidth: this.config.heygen_video_width,
      videoHeight: this.config.heygen_video_height,
    });
  }

  async generate(content: ContentItem): Promise<Video> {
    if (content.id == null) {
      throw new Error("Content item must have an id before video generation");
    }

    this.db.update_content_status(content.id, ContentStatus.VIDEO_GENERATING);

    const mode = this.config.heygen_video_mode;
    const result = mode === "agent" ? await this._generateAgent(content) : await this._generateAvatar(content);

    const videoPath = await downloadFile(
      result.videoUrl,
      this.config.video_storage_dir,
      `content_${content.id}.mp4`,
    );

    const thumbnailPath = result.thumbnailUrl
      ? await downloadFile(
          result.thumbnailUrl,
          this.config.video_storage_dir,
          `content_${content.id}_thumb.jpg`,
        )
      : null;

    const video: Video = {
      content_id: content.id,
      heygen_video_id: result.videoId,
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      duration_seconds: 5,
      status: ContentStatus.VIDEO_READY,
      created_at: new Date().toISOString(),
    };

    const videoId = this.db.insert_video(video);
    video.id = videoId;
    this.db.update_content_status(content.id, ContentStatus.VIDEO_READY);
    this.db.log_action(content.id, "VideoProducerAgent", "video_generated", {
      videoId,
      path: videoPath,
      heygenVideoId: result.videoId,
      mode,
    });

    return video;
  }

  private async _generateAvatar(content: ContentItem): Promise<{ videoId: string; videoUrl: string; thumbnailUrl: string | null }> {
    const spokenText = content.cta
      ? `${content.script} ${content.cta}`
      : content.script;
    const result = await this.heygen.generateVideo(
      spokenText,
      `content_${content.id}`,
      this.lookIds,
      this.variationIndex,
    );
    this.variationIndex += 1;
    return result;
  }

  private async _generateAgent(content: ContentItem): Promise<{ videoId: string; videoUrl: string; thumbnailUrl: string | null }> {
    const outfit = OUTFITS[this.variationIndex % OUTFITS.length];
    const parts = [
      "Create a professional short-form video ad in portrait orientation (9:16 aspect ratio). Target duration is approximately 20 seconds across 3-4 scenes. Language: English. Do not include captions.",
      "",
      `Script (read exactly as written): ${content.script}`,
      "",
      "Style: Professional, trustworthy, and clean corporate aesthetic. Soft office background.",
      "",
      `Avatar: Evelyn Hartwell - a professional woman wearing ${outfit}, an HR expert with 40 years of experience. Voice should be professional and knowledgeable.`,
    ];

    if (content.visual_direction) {
      parts.push(`\nVisual direction: ${content.visual_direction}`);
    }
    if (content.cta) {
      parts.push(`\nEnd with a clear call to action: ${content.cta}`);
    }
    parts.push(
      "\nAdd smooth transitions between scenes, relevant supporting graphics, and fitting professional background music.",
    );

    const avatarId =
      this.lookIds.length > 0
        ? this.lookIds[this.variationIndex % this.lookIds.length]
        : this.config.heygen_avatar_id;
    const result = await this.heygen.generateVideoAgent(parts.join("\n"), avatarId || undefined);
    this.variationIndex += 1;
    return result;
  }
}
