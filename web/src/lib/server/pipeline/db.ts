import fs from "fs";
import path from "path";
import { createRequire } from "module";
import type { Database as SqliteDatabase } from "better-sqlite3";
import {
  ContentItem,
  ContentStatus,
  InstagramPost,
  SoftwareCategory,
  Video,
  YouTubeUpload,
} from "@/lib/server/pipeline/models";

const require = createRequire(import.meta.url);

type SqliteCtor = new (filename: string) => SqliteDatabase;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    script_type TEXT,
    hook TEXT NOT NULL,
    script TEXT NOT NULL,
    cta TEXT NOT NULL,
    visual_direction TEXT DEFAULT '',
    target_url TEXT DEFAULT 'https://www.softwareadvice.com',
    status TEXT DEFAULT 'idea',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    approved_by TEXT
);

CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL REFERENCES content_items(id),
    heygen_video_id TEXT,
    video_path TEXT,
    thumbnail_path TEXT,
    duration_seconds REAL DEFAULT 5.0,
    status TEXT DEFAULT 'video_generating',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instagram_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL REFERENCES videos(id),
    instagram_media_id TEXT,
    caption TEXT,
    hashtags TEXT,
    posted_at TEXT
);

CREATE TABLE IF NOT EXISTS youtube_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL REFERENCES videos(id),
    youtube_video_id TEXT,
    title TEXT,
    description TEXT,
    tags TEXT,
    posted_at TEXT
);

CREATE TABLE IF NOT EXISTS workflow_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER REFERENCES content_items(id),
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seo_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER UNIQUE NOT NULL REFERENCES videos(id),
    page_title TEXT,
    meta_description TEXT,
    focus_keywords TEXT,
    og_title TEXT,
    og_description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS geo_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    h1 TEXT,
    meta_title TEXT,
    meta_description TEXT,
    intro TEXT,
    benefits TEXT,
    cta_text TEXT,
    local_stat TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

const CONTENT_STATUS_VALUES = new Set<string>(Object.values(ContentStatus));
const SOFTWARE_CATEGORY_VALUES = new Set<string>(Object.values(SoftwareCategory));

interface ContentItemRow {
  id: number;
  category: string;
  script_type: string | null;
  hook: string;
  script: string;
  cta: string;
  visual_direction: string | null;
  target_url: string;
  status: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

interface VideoRow {
  id: number;
  content_id: number;
  heygen_video_id: string | null;
  video_path: string | null;
  thumbnail_path: string | null;
  duration_seconds: number;
  status: string;
  created_at: string;
}

interface StatusCountRow {
  status: string;
  cnt: number;
}

export interface SeoMetadataRow {
  id: number;
  video_id: number;
  page_title: string | null;
  meta_description: string | null;
  focus_keywords: string[];
  og_title: string | null;
  og_description: string | null;
  created_at: string;
}

interface SeoMetadataDbRow {
  id: number;
  video_id: number;
  page_title: string | null;
  meta_description: string | null;
  focus_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  created_at: string;
}

export interface GeoPage {
  id?: number;
  slug: string;
  category: string;
  city: string;
  state: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  intro: string;
  benefits: string[];
  cta_text: string;
  local_stat: string;
  created_at?: string;
}

interface GeoPageDbRow {
  id: number;
  slug: string;
  category: string;
  city: string;
  state: string;
  h1: string | null;
  meta_title: string | null;
  meta_description: string | null;
  intro: string | null;
  benefits: string | null;
  cta_text: string | null;
  local_stat: string | null;
  created_at: string;
}

export interface SeoMetadataInput {
  page_title?: string;
  meta_description?: string;
  focus_keywords?: string[];
  og_title?: string;
  og_description?: string;
}

function normalizeContentStatus(value: string): ContentStatus {
  if (CONTENT_STATUS_VALUES.has(value)) return value as ContentStatus;
  return ContentStatus.FAILED;
}

function normalizeSoftwareCategory(value: string): SoftwareCategory {
  if (SOFTWARE_CATEGORY_VALUES.has(value)) return value as SoftwareCategory;
  return SoftwareCategory.PROJECT_MANAGEMENT;
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    return [];
  }
  return [];
}

export class Database {
  private conn: SqliteDatabase;

  constructor(db_path: string) {
    fs.mkdirSync(path.dirname(db_path), { recursive: true });

    const BetterSqlite3 = require("better-sqlite3") as SqliteCtor;
    this.conn = new BetterSqlite3(db_path);
    this.conn.pragma("journal_mode = WAL");
    this.conn.pragma("foreign_keys = ON");
    this._init_schema();
  }

  private _init_schema(): void {
    this.conn.exec(SCHEMA);
    const migrations = ["ALTER TABLE content_items ADD COLUMN script_type TEXT"];
    for (const sql of migrations) {
      try {
        this.conn.exec(sql);
      } catch {
      }
    }
  }

  close(): void {
    this.conn.close();
  }

  insert_content_item(item: ContentItem): number {
    const scriptType = item.script_type ?? item.scriptType ?? null;
    const visualDirection = item.visual_direction ?? item.visualDirection ?? "";
    const targetUrl = item.target_url ?? item.targetUrl ?? "https://www.softwareadvice.com";
    const result = this.conn
      .prepare(
        `INSERT INTO content_items
         (category, script_type, hook, script, cta, visual_direction, target_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        item.category,
        scriptType,
        item.hook,
        item.script,
        item.cta,
        visualDirection,
        targetUrl,
        item.status
      );
    return Number(result.lastInsertRowid);
  }

  get_content_item(item_id: number): ContentItem | null {
    const row = this.conn
      .prepare("SELECT * FROM content_items WHERE id = ?")
      .get(item_id) as ContentItemRow | undefined;
    if (!row) return null;
    return this._row_to_content_item(row);
  }

  get_items_by_status(status: ContentStatus): ContentItem[] {
    const rows = this.conn
      .prepare("SELECT * FROM content_items WHERE status = ? ORDER BY id")
      .all(status) as ContentItemRow[];
    return rows.map((row) => this._row_to_content_item(row));
  }

  get_recent_hooks(category: string, limit = 50): string[] {
    const rows = this.conn
      .prepare("SELECT hook FROM content_items WHERE category = ? ORDER BY id DESC LIMIT ?")
      .all(category, limit) as Array<{ hook: string }>;
    return rows.map((row) => row.hook);
  }

  update_content_status(item_id: number, status: ContentStatus, approved_by?: string): void {
    if (approved_by) {
      this.conn
        .prepare(
          "UPDATE content_items SET status = ?, approved_at = ?, approved_by = ? WHERE id = ?"
        )
        .run(status, new Date().toISOString(), approved_by, item_id);
      return;
    }

    this.conn.prepare("UPDATE content_items SET status = ? WHERE id = ?").run(status, item_id);
  }

  insert_video(video: Video): number {
    const contentId = video.content_id ?? video.contentId;
    if (typeof contentId !== "number") {
      throw new Error("Video is missing content_id/contentId");
    }
    const result = this.conn
      .prepare(
        `INSERT INTO videos
         (content_id, heygen_video_id, video_path, thumbnail_path, duration_seconds, status)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        contentId,
        video.heygen_video_id ?? video.heygenVideoId ?? null,
        video.video_path ?? video.videoPath ?? null,
        video.thumbnail_path ?? video.thumbnailPath ?? null,
        video.duration_seconds ?? video.durationSeconds ?? 5.0,
        video.status
      );
    return Number(result.lastInsertRowid);
  }

  get_video(video_id: number): Video | null {
    const row = this.conn.prepare("SELECT * FROM videos WHERE id = ?").get(video_id) as
      | VideoRow
      | undefined;
    if (!row) return null;
    return this._row_to_video(row);
  }

  get_video_by_content_id(content_id: number): Video | null {
    const row = this.conn
      .prepare("SELECT * FROM videos WHERE content_id = ? ORDER BY id DESC LIMIT 1")
      .get(content_id) as VideoRow | undefined;
    if (!row) return null;
    return this._row_to_video(row);
  }

  get_videos_by_status(status: ContentStatus): Video[] {
    const rows = this.conn
      .prepare("SELECT * FROM videos WHERE status = ? ORDER BY id")
      .all(status) as VideoRow[];
    return rows.map((row) => this._row_to_video(row));
  }

  update_video(video_id: number, kwargs: Record<string, unknown>): void {
    const entries = Object.entries(kwargs);
    if (entries.length === 0) return;

    const allowed = new Set([
      "content_id",
      "heygen_video_id",
      "video_path",
      "thumbnail_path",
      "duration_seconds",
      "status",
      "created_at",
    ]);

    for (const [key] of entries) {
      if (!allowed.has(key)) {
        throw new Error(`Invalid update field: ${key}`);
      }
    }

    const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    this.conn
      .prepare(`UPDATE videos SET ${setClause} WHERE id = ?`)
      .run(...values, video_id);
  }

  insert_instagram_post(post: InstagramPost): number {
    const videoId = post.video_id ?? post.videoId;
    if (typeof videoId !== "number") {
      throw new Error("Instagram post is missing video_id/videoId");
    }
    const postedAtValue = post.posted_at ?? post.postedAt ?? null;
    const postedAt =
      postedAtValue instanceof Date
        ? postedAtValue.toISOString()
        : typeof postedAtValue === "string"
          ? postedAtValue
          : null;
    const result = this.conn
      .prepare(
        `INSERT INTO instagram_posts
         (video_id, instagram_media_id, caption, hashtags, posted_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        videoId,
        post.instagram_media_id ?? post.instagramMediaId ?? null,
        post.caption,
        JSON.stringify(post.hashtags),
        postedAt
      );
    return Number(result.lastInsertRowid);
  }

  insert_youtube_upload(upload: YouTubeUpload): number {
    const videoId = upload.video_id ?? upload.videoId;
    if (typeof videoId !== "number") {
      throw new Error("YouTube upload is missing video_id/videoId");
    }
    const postedAtValue = upload.posted_at ?? upload.postedAt ?? null;
    const postedAt =
      postedAtValue instanceof Date
        ? postedAtValue.toISOString()
        : typeof postedAtValue === "string"
          ? postedAtValue
          : null;
    const result = this.conn
      .prepare(
        `INSERT INTO youtube_uploads
         (video_id, youtube_video_id, title, description, tags, posted_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        videoId,
        upload.youtube_video_id ?? upload.youtubeVideoId ?? null,
        upload.title,
        upload.description,
        JSON.stringify(upload.tags),
        postedAt
      );
    return Number(result.lastInsertRowid);
  }

  log_action(content_id: number, agent: string, action: string, details: Record<string, unknown>): void {
    this.conn
      .prepare(
        "INSERT INTO workflow_log (content_id, agent, action, details) VALUES (?, ?, ?, ?)"
      )
      .run(content_id, agent, action, JSON.stringify(details));
  }

  get_status_counts(): Record<string, number> {
    const rows = this.conn
      .prepare("SELECT status, COUNT(*) as cnt FROM content_items GROUP BY status")
      .all() as StatusCountRow[];

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = row.cnt;
    }
    return counts;
  }

  get_all_posted_videos(): Array<Record<string, unknown>> {
    const rows = this.conn
      .prepare(
        `SELECT v.*, c.hook, c.script, c.cta, c.category,
                y.youtube_video_id, y.title, y.description as yt_description,
                i.instagram_media_id
         FROM videos v
         JOIN content_items c ON v.content_id = c.id
         LEFT JOIN youtube_uploads y ON y.video_id = v.id
         LEFT JOIN instagram_posts i ON i.video_id = v.id
         WHERE c.status IN ('posted_instagram', 'posted_youtube', 'completed')
         ORDER BY v.created_at DESC`
      )
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({ ...row }));
  }

  get_unposted_videos(platform: "both" | "instagram" | "youtube" = "both"): Video[] {
    let rows: VideoRow[];

    if (platform === "instagram") {
      rows = this.conn
        .prepare(
          `SELECT v.* FROM videos v
           JOIN content_items c ON v.content_id = c.id
           LEFT JOIN instagram_posts i ON i.video_id = v.id
           WHERE i.id IS NULL
           AND c.status IN ('video_approved', 'posted_youtube', 'completed')
           ORDER BY v.id`
        )
        .all() as VideoRow[];
    } else if (platform === "youtube") {
      rows = this.conn
        .prepare(
          `SELECT v.* FROM videos v
           JOIN content_items c ON v.content_id = c.id
           LEFT JOIN youtube_uploads y ON y.video_id = v.id
           WHERE y.id IS NULL
           AND c.status IN ('video_approved', 'posted_instagram', 'completed')
           ORDER BY v.id`
        )
        .all() as VideoRow[];
    } else {
      rows = this.conn
        .prepare(
          `SELECT DISTINCT v.* FROM videos v
           JOIN content_items c ON v.content_id = c.id
           LEFT JOIN instagram_posts i ON i.video_id = v.id
           LEFT JOIN youtube_uploads y ON y.video_id = v.id
           WHERE (i.id IS NULL OR y.id IS NULL)
           AND c.status IN ('video_approved', 'posted_instagram', 'posted_youtube', 'completed')
           ORDER BY v.id`
        )
        .all() as VideoRow[];
    }

    return rows.map((row) => this._row_to_video(row));
  }

  upsert_seo_metadata(video_id: number, data: SeoMetadataInput): void {
    this.conn
      .prepare(
        `INSERT INTO seo_metadata
         (video_id, page_title, meta_description, focus_keywords, og_title, og_description)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(video_id) DO UPDATE SET
           page_title = excluded.page_title,
           meta_description = excluded.meta_description,
           focus_keywords = excluded.focus_keywords,
           og_title = excluded.og_title,
           og_description = excluded.og_description`
      )
      .run(
        video_id,
        data.page_title ?? "",
        data.meta_description ?? "",
        JSON.stringify(data.focus_keywords ?? []),
        data.og_title ?? "",
        data.og_description ?? ""
      );
  }

  get_seo_metadata(video_id: number): Record<string, unknown> | null {
    const row = this.conn
      .prepare("SELECT * FROM seo_metadata WHERE video_id = ?")
      .get(video_id) as SeoMetadataDbRow | undefined;
    if (!row) return null;
    return {
      id: row.id,
      video_id: row.video_id,
      page_title: row.page_title,
      meta_description: row.meta_description,
      focus_keywords: parseStringArray(row.focus_keywords),
      og_title: row.og_title,
      og_description: row.og_description,
      created_at: row.created_at,
    };
  }

  insert_geo_page(data: GeoPage): number {
    const result = this.conn
      .prepare(
        `INSERT INTO geo_pages
         (slug, category, city, state, h1, meta_title, meta_description, intro, benefits, cta_text, local_stat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.slug,
        data.category,
        data.city,
        data.state,
        data.h1,
        data.meta_title,
        data.meta_description,
        data.intro,
        JSON.stringify(data.benefits),
        data.cta_text,
        data.local_stat
      );

    return Number(result.lastInsertRowid);
  }

  get_geo_page(slug: string): GeoPage | null {
    const row = this.conn
      .prepare("SELECT * FROM geo_pages WHERE slug = ?")
      .get(slug) as GeoPageDbRow | undefined;
    if (!row) return null;
    return this._row_to_geo_page(row);
  }

  get_all_geo_pages(): GeoPage[] {
    const rows = this.conn
      .prepare("SELECT * FROM geo_pages ORDER BY category, city")
      .all() as GeoPageDbRow[];
    return rows.map((row) => this._row_to_geo_page(row));
  }

  get_geo_pages_by_category(category: string): GeoPage[] {
    const rows = this.conn
      .prepare("SELECT * FROM geo_pages WHERE category = ? ORDER BY city")
      .all(category) as GeoPageDbRow[];
    return rows.map((row) => this._row_to_geo_page(row));
  }

  private _row_to_content_item(row: ContentItemRow): ContentItem {
    return {
      id: row.id,
      category: normalizeSoftwareCategory(row.category),
      script_type: row.script_type,
      scriptType: row.script_type,
      hook: row.hook,
      script: row.script,
      cta: row.cta,
      visual_direction: row.visual_direction || "",
      visualDirection: row.visual_direction || "",
      target_url: row.target_url,
      targetUrl: row.target_url,
      status: normalizeContentStatus(row.status),
      created_at: row.created_at,
      createdAt: row.created_at,
      approved_at: row.approved_at,
      approvedAt: row.approved_at,
      approved_by: row.approved_by,
      approvedBy: row.approved_by,
    };
  }

  private _row_to_video(row: VideoRow): Video {
    return {
      id: row.id,
      content_id: row.content_id,
      contentId: row.content_id,
      heygen_video_id: row.heygen_video_id,
      heygenVideoId: row.heygen_video_id,
      video_path: row.video_path,
      videoPath: row.video_path,
      thumbnail_path: row.thumbnail_path,
      thumbnailPath: row.thumbnail_path,
      duration_seconds: row.duration_seconds,
      durationSeconds: row.duration_seconds,
      status: normalizeContentStatus(row.status),
      created_at: row.created_at,
      createdAt: row.created_at,
    };
  }

  private _row_to_geo_page(row: GeoPageDbRow): GeoPage {
    return {
      id: row.id,
      slug: row.slug,
      category: row.category,
      city: row.city,
      state: row.state,
      h1: row.h1 || "",
      meta_title: row.meta_title || "",
      meta_description: row.meta_description || "",
      intro: row.intro || "",
      benefits: parseStringArray(row.benefits),
      cta_text: row.cta_text || "",
      local_stat: row.local_stat || "",
      created_at: row.created_at,
    };
  }

  insertContentItem(item: ContentItem): number {
    return this.insert_content_item(item);
  }

  getContentItem(itemId: number): ContentItem | null {
    return this.get_content_item(itemId);
  }

  getItemsByStatus(status: ContentStatus): ContentItem[] {
    return this.get_items_by_status(status);
  }

  updateContentStatus(itemId: number, status: ContentStatus, approvedBy?: string): void {
    this.update_content_status(itemId, status, approvedBy);
  }

  insertVideo(video: Video): number {
    return this.insert_video(video);
  }

  getVideo(videoId: number): Video | null {
    return this.get_video(videoId);
  }

  getVideoByContentId(contentId: number): Video | null {
    return this.get_video_by_content_id(contentId);
  }

  getVideosByStatus(status: ContentStatus): Video[] {
    return this.get_videos_by_status(status);
  }

  updateVideo(videoId: number, updates: Record<string, unknown>): void {
    this.update_video(videoId, updates);
  }

  insertInstagramPost(post: InstagramPost): number {
    return this.insert_instagram_post(post);
  }

  insertYoutubeUpload(upload: YouTubeUpload): number {
    return this.insert_youtube_upload(upload);
  }

  logAction(contentId: number, agent: string, action: string, details: Record<string, unknown>): void {
    this.log_action(contentId, agent, action, details);
  }

  getStatusCounts(): Record<string, number> {
    return this.get_status_counts();
  }

  getAllPostedVideos(): Array<Record<string, unknown>> {
    return this.get_all_posted_videos();
  }

  getUnpostedVideos(platform: "both" | "instagram" | "youtube" = "both"): Video[] {
    return this.get_unposted_videos(platform);
  }

  upsertSeoMetadata(videoId: number, data: Record<string, unknown>): void {
    const normalized: SeoMetadataInput = {
      page_title:
        typeof data.page_title === "string"
          ? data.page_title
          : typeof data.pageTitle === "string"
            ? data.pageTitle
            : "",
      meta_description:
        typeof data.meta_description === "string"
          ? data.meta_description
          : typeof data.metaDescription === "string"
            ? data.metaDescription
            : "",
      focus_keywords: Array.isArray(data.focus_keywords)
        ? data.focus_keywords.filter((value): value is string => typeof value === "string")
        : Array.isArray(data.focusKeywords)
          ? data.focusKeywords.filter((value): value is string => typeof value === "string")
          : [],
      og_title:
        typeof data.og_title === "string"
          ? data.og_title
          : typeof data.ogTitle === "string"
            ? data.ogTitle
            : "",
      og_description:
        typeof data.og_description === "string"
          ? data.og_description
          : typeof data.ogDescription === "string"
            ? data.ogDescription
            : "",
    };

    this.upsert_seo_metadata(videoId, normalized);
  }

  getSeoMetadata(videoId: number): Record<string, unknown> | null {
    const data = this.get_seo_metadata(videoId);
    if (!data) return null;
    return {
      pageTitle: data.page_title,
      metaDescription: data.meta_description,
      focusKeywords: data.focus_keywords,
      ogTitle: data.og_title,
      ogDescription: data.og_description,
    };
  }

  insertGeoPage(data: GeoPage): number {
    return this.insert_geo_page(data);
  }

  getGeoPage(slug: string): GeoPage | null {
    return this.get_geo_page(slug);
  }

  getAllGeoPages(): GeoPage[] {
    return this.get_all_geo_pages();
  }

  getGeoPagesByCategory(category: string): GeoPage[] {
    return this.get_geo_pages_by_category(category);
  }
}

export class PipelineDb extends Database {}
