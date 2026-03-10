import type { PipelineConfig } from "./config";
import { ContentStrategistAgent } from "./contentStrategist";
import { Database } from "./db";
import { exportSiteData } from "./export";
import { FrontendSEOAgent } from "./frontendSeo";
import { InstagramAgent } from "./instagram";
import {
  ContentStatus,
  SoftwareCategory,
  type ContentItem,
  type Video,
} from "./models";
import { TARGET_CITIES } from "./prompts";
import { VideoProducerAgent } from "./videoProducer";
import { YouTubeAgent } from "./youtube";

function log(message: string): void {
  console.log("[pipeline]", message);
}

function toVideoRow(row: Record<string, unknown>): Video | null {
  if (typeof row.id !== "number" || typeof row.content_id !== "number") {
    return null;
  }

  return {
    id: row.id,
    content_id: row.content_id,
    heygen_video_id: typeof row.heygen_video_id === "string" ? row.heygen_video_id : null,
    video_path: typeof row.video_path === "string" ? row.video_path : null,
    thumbnail_path: typeof row.thumbnail_path === "string" ? row.thumbnail_path : null,
    duration_seconds: typeof row.duration_seconds === "number" ? row.duration_seconds : 0,
    status: ContentStatus.VIDEO_READY,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
  };
}

export class Orchestrator {
  private readonly config: PipelineConfig;
  private readonly db: Database;
  private readonly contentAgent: ContentStrategistAgent;
  private readonly videoAgent: VideoProducerAgent;
  private readonly instagramAgent: InstagramAgent;
  private readonly youtubeAgent: YouTubeAgent;
  private readonly frontendAgent: FrontendSEOAgent;

  constructor(config: PipelineConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.contentAgent = new ContentStrategistAgent(this.config, this.db);
    this.videoAgent = new VideoProducerAgent(this.config, this.db);
    this.instagramAgent = new InstagramAgent(this.config, this.db);
    this.youtubeAgent = new YouTubeAgent(this.config, this.db);
    this.frontendAgent = new FrontendSEOAgent(this.config, this.db);
  }

  async generateScripts(
    instruction: string,
    count = 3,
    category?: SoftwareCategory,
  ): Promise<ContentItem[]> {
    const items = await this.contentAgent.generate(instruction, count, category);
    log(`Generated ${items.length} scripts`);
    return items;
  }

  async produceVideos(limit?: number, contentId?: number): Promise<Video[]> {
    let scripts: ContentItem[];
    if (typeof contentId === "number") {
      const item = this.db.get_content_item(contentId);
      if (!item) {
        log(`Content item #${contentId} not found`);
        return [];
      }
      if (item.status === ContentStatus.SCRIPT_DRAFT && item.id != null) {
        this.db.update_content_status(item.id, ContentStatus.SCRIPT_APPROVED);
        item.status = ContentStatus.SCRIPT_APPROVED;
        log(`Auto-approved script #${item.id} for production`);
      }
      if (item.status !== ContentStatus.SCRIPT_APPROVED) {
        log(`Script #${contentId} is not in script_approved status (current: ${item.status})`);
        return [];
      }
      scripts = [item];
    } else {
      const approvedScripts = this.db.get_items_by_status(ContentStatus.SCRIPT_APPROVED);
      scripts = typeof limit === "number" ? approvedScripts.slice(0, limit) : approvedScripts;
    }
    if (scripts.length === 0) {
      log("No approved scripts available for video generation");
      return [];
    }

    const videos: Video[] = [];
    for (const script of scripts) {
      try {
        if (script.id != null) {
          const existing = this.db.get_video_by_content_id(script.id);
          if (existing) {
            log(`Skipping content #${script.id} — video already exists (video #${existing.id})`);
            continue;
          }
        }
        const video = await this.videoAgent.generate(script);
        videos.push(video);
      } catch (error) {
        if (script.id != null) {
          this.db.update_content_status(script.id, ContentStatus.FAILED);
        }
        log(`Video generation failed for content #${script.id}: ${String(error)}`);
      }
    }

    log(`Generated ${videos.length} videos`);
    return videos;
  }

  async postApprovedVideos(platform: "both" | "instagram" | "youtube" = "both", limit?: number): Promise<number> {
    const videos = this.db.get_unposted_videos(platform);
    const queue = typeof limit === "number" ? videos.slice(0, limit) : videos;

    if (queue.length === 0) {
      log("No unposted videos found");
      return 0;
    }

    const completedVideos: Video[] = [];
    let fullyPosted = 0;

    for (const video of queue) {
      const content = this.db.get_content_item(video.content_id);
      if (!content || content.id == null) {
        continue;
      }

      let igOk = platform === "youtube";
      let ytOk = platform === "instagram";

      if (platform === "both" || platform === "instagram") {
        try {
          await this.instagramAgent.post(video, content);
          igOk = true;
        } catch (error) {
          igOk = false;
          log(`Instagram post failed for video #${video.id}: ${String(error)}`);
        }
      }

      if (platform === "both" || platform === "youtube") {
        try {
          await this.youtubeAgent.upload(video, content);
          ytOk = true;
        } catch (error) {
          ytOk = false;
          log(`YouTube upload failed for video #${video.id}: ${String(error)}`);
        }
      }

      if (igOk && ytOk) {
        this.db.update_content_status(content.id, ContentStatus.COMPLETED);
        if (video.id != null) this.db.update_video_status(video.id, ContentStatus.COMPLETED);
        fullyPosted += 1;
        completedVideos.push(video);
      } else if (igOk) {
        this.db.update_content_status(content.id, ContentStatus.POSTED_INSTAGRAM);
        if (video.id != null) this.db.update_video_status(video.id, ContentStatus.POSTED_INSTAGRAM);
      } else if (ytOk) {
        this.db.update_content_status(content.id, ContentStatus.POSTED_YOUTUBE);
        if (video.id != null) this.db.update_video_status(video.id, ContentStatus.POSTED_YOUTUBE);
      }
    }

    if (completedVideos.length > 0) {
      await this.frontendAgent.runFullUpdate(completedVideos);
      const counts = exportSiteData(this.db);
      log(`Exported site data (${counts.videos} videos, ${counts.geoPages} geo pages)`);
    }

    log(`Posted ${fullyPosted} videos`);
    return fullyPosted;
  }

  async seoUpdate(): Promise<void> {
    const videos = this.db
      .get_all_posted_videos()
      .map((row) => toVideoRow(row))
      .filter((row): row is Video => row !== null);

    await this.frontendAgent.runFullUpdate(videos);
    const counts = exportSiteData(this.db);
    log(`Exported site data (${counts.videos} videos, ${counts.geoPages} geo pages)`);
  }

  async generateGeoPages(category?: SoftwareCategory, cities = 20): Promise<number> {
    const categories = category ? [category] : Object.values(SoftwareCategory);
    const cityList = TARGET_CITIES.slice(0, cities);
    const count = await this.frontendAgent.generateGeoPages(categories, cityList);
    exportSiteData(this.db);
    log(`Generated ${count} geo pages`);
    return count;
  }
}

export { Orchestrator as OrchestratorAgent };
