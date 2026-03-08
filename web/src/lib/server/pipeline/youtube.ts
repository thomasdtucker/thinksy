import fs from "node:fs";

import { google, youtube_v3 } from "googleapis";

import type { PipelineConfig } from "./config";
import { Database } from "./db";
import { ClaudeClient } from "./llm";
import { SEO_PROMPT, SEO_SYSTEM } from "./prompts";
import { ContentStatus, type ContentItem, type Video, type YouTubeUpload } from "./models";

type YoutubeMetadata = {
  title: string;
  description: string;
  tags: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function generateYoutubeMetadata(
  llm: ClaudeClient,
  content: ContentItem,
): Promise<YoutubeMetadata> {
  const result = await llm.chatJson(
    SEO_SYSTEM,
    SEO_PROMPT.replace("{category}", content.category)
      .replace("{hook}", content.hook)
      .replace("{script}", content.script)
      .replace("{cta}", content.cta),
  );

  if (!isRecord(result)) {
    throw new Error("YouTube SEO response must be an object");
  }
  if (typeof result.title !== "string" || result.title.length === 0) {
    throw new Error("YouTube SEO response missing title");
  }
  if (typeof result.description !== "string" || result.description.length === 0) {
    throw new Error("YouTube SEO response missing description");
  }
  if (!Array.isArray(result.tags) || !result.tags.every((tag) => typeof tag === "string")) {
    throw new Error("YouTube SEO response missing tags");
  }

  return {
    title: result.title,
    description: result.description,
    tags: result.tags,
  };
}

export class YouTubeAgent {
  private readonly config: PipelineConfig;
  private readonly db: Database;
  private readonly llm: ClaudeClient;

  constructor(config: PipelineConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.llm = new ClaudeClient(this.config.anthropic_api_key);
  }

  async upload(video: Video, content: ContentItem): Promise<YouTubeUpload> {
    if (video.id == null || content.id == null || !video.video_path) {
      throw new Error("Video must include id, content_id, and video_path for YouTube upload");
    }

    const metadata = await generateYoutubeMetadata(this.llm, content);
    const youtube = this._getService();

    const requestBody: youtube_v3.Schema$Video = {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: "28",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody,
      media: { body: fs.createReadStream(video.video_path) },
    });
    const response = res.data;
    const youtubeVideoId = response.id;
    if (!youtubeVideoId) {
      throw new Error("YouTube upload succeeded without returning a video id");
    }

    const upload: YouTubeUpload = {
      video_id: video.id,
      youtube_video_id: youtubeVideoId,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      posted_at: new Date().toISOString(),
    };

    upload.id = this.db.insert_youtube_upload(upload);
    this.db.update_content_status(content.id, ContentStatus.POSTED_YOUTUBE);
    this.db.log_action(content.id, "YouTubeAgent", "uploaded_video", {
      uploadId: upload.id,
      youtubeId: youtubeVideoId,
    });

    return upload;
  }

  private _getService(): youtube_v3.Youtube {
    const auth = new google.auth.OAuth2(
      this.config.youtube_client_id,
      this.config.youtube_client_secret,
    );
    auth.setCredentials({ refresh_token: this.config.youtube_refresh_token });
    return google.youtube({ version: "v3", auth });
  }

}
