import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { google } from "googleapis";

import type { PipelineConfig } from "./config";
import { Database, type GeoPage } from "./db";
import { ClaudeClient } from "./llm";
import {
  GEO_PAGE_PROMPT,
  GEO_PAGE_SYSTEM,
  SEO_METADATA_PROMPT,
  SEO_METADATA_SYSTEM,
  TARGET_CITIES,
} from "./prompts";
import { SoftwareCategory, type ContentItem, type Video } from "./models";

const CATEGORY_DISPLAY: Record<string, string> = {
  hr: "HR Software",
  accounting: "Accounting Software",
  project_management: "Project Management Software",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

function toSlug(category: string, city: string, state: string): string {
  return `${category.replaceAll("_", "-")}-software-${city.toLowerCase().replaceAll(" ", "-")}-${state.toLowerCase()}`;
}

export class FrontendSEOAgent {
  private readonly config: PipelineConfig;
  private readonly db: Database;
  private readonly llm: ClaudeClient;
  private readonly webDir: string;

  constructor(config: PipelineConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.llm = new ClaudeClient(this.config.anthropic_api_key);
    const repoRoot = path.join(process.cwd(), "..");
    this.webDir = path.join(repoRoot, "web");
  }

  async processNewVideos(videos: Video[]): Promise<void> {
    for (const video of videos) {
      const content = this.db.get_content_item(video.content_id);

      if (!content) {
        continue;
      }

      const seoData = await this.generatePageSeo(content, video);
      if (video.id == null) {
        continue;
      }
      this.db.upsert_seo_metadata(video.id, seoData);
      this.db.log_action(content.id ?? 0, "FrontendSEOAgent", "generated_seo_metadata", seoData);
    }
  }

  async generateGeoPages(
    categories: string[] = Object.values(SoftwareCategory),
    cities: Array<[string, string]> = TARGET_CITIES,
  ): Promise<number> {
    let count = 0;
    for (const category of categories) {
      for (const [city, state] of cities) {
        const slug = toSlug(category, city, state);
        if (this.db.get_geo_page(slug)) {
          continue;
        }

        const pageData = await this.generateGeoPage(CATEGORY_DISPLAY[category] ?? category, city, state);
        const payload: GeoPage = {
          slug,
          category,
          city,
          state,
          h1: readString(pageData, "h1"),
          meta_title: readString(pageData, "meta_title"),
          meta_description: readString(pageData, "meta_description"),
          intro: readString(pageData, "intro"),
          benefits: readStringArray(pageData, "benefits"),
          cta_text: readString(pageData, "cta_text"),
          local_stat: readString(pageData, "local_stat"),
        };
        this.db.insert_geo_page(payload);
        this.db.log_action(0, "FrontendSEOAgent", "generated_geo_page", { slug });
        count += 1;
      }
    }

    return count;
  }

  rebuildSite(): boolean {
    const packageJsonPath = path.join(this.webDir, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    execSync("npm run build", { cwd: this.webDir, stdio: "pipe" });
    return true;
  }

  async submitUrlsToGoogle(urls?: string[]): Promise<number> {
    if (!this.config.google_indexing_key_path) {
      return 0;
    }

    const targetUrls = urls ?? this.collectAllUrls();
    const auth = new google.auth.GoogleAuth({
      keyFile: this.config.google_indexing_key_path,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });
    const indexing = google.indexing({ version: "v3", auth });

    let submitted = 0;
    for (const url of targetUrls) {
      try {
        await indexing.urlNotifications.publish({
          requestBody: { url, type: "URL_UPDATED" },
        });
        submitted += 1;
      } catch {
        continue;
      }
    }
    return submitted;
  }

  async runFullUpdate(videos: Video[]): Promise<void> {
    if (videos.length > 0) {
      await this.processNewVideos(videos);
    }
    await this.generateGeoPages();
    this.rebuildSite();

    const videoUrls = videos
      .filter((video) => video.id != null)
      .map((video) => `${this.config.public_video_host}/videos/${video.id}`);
    await this.submitUrlsToGoogle(videoUrls);
  }

  private collectAllUrls(): string[] {
    const base = this.config.public_video_host;
    const urls = [base];

    const videos = this.db.get_all_posted_videos();
    for (const video of videos) {
      if ("id" in video && typeof video.id === "number") {
        urls.push(`${base}/videos/${video.id}`);
      }
    }

    const pages = this.db.get_all_geo_pages();
    for (const page of pages) {
      if ("slug" in page && typeof page.slug === "string") {
        urls.push(`${base}/${page.slug}`);
      }
    }

    return urls;
  }

  private async generatePageSeo(content: ContentItem, video: Video): Promise<Record<string, unknown>> {
    const result = await this.llm.chatJson(
      SEO_METADATA_SYSTEM,
      SEO_METADATA_PROMPT.replace("{category}", content.category)
        .replace("{hook}", content.hook)
        .replace("{script}", content.script)
        .replace("{cta}", content.cta)
        .replace("{video_id}", String(video.id ?? "")),
    );
    if (!isRecord(result)) {
      throw new Error("SEO metadata response must be an object");
    }
    return result;
  }

  private async generateGeoPage(
    categoryLabel: string,
    city: string,
    state: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.llm.chatJson(
      GEO_PAGE_SYSTEM,
      GEO_PAGE_PROMPT.replace("{category}", categoryLabel)
        .replace("{city}", city)
        .replace("{state}", state),
    );
    if (!isRecord(result)) {
      throw new Error("Geo page response must be an object");
    }
    return result;
  }
}
