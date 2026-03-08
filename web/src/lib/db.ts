import type { Database as SqliteDatabase } from "better-sqlite3";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { loadRootEnv } from "@/lib/server/loadRootEnv";
import type { VideoItem } from "./types";

loadRootEnv();

function resolveDbPath(): string {
  const envPath = process.env.DB_PATH;
  if (!envPath) return path.join(process.cwd(), "..", "data", "thinksy.db");
  if (path.isAbsolute(envPath)) return envPath;

  const fromCwd = path.resolve(process.cwd(), envPath);
  const fromRepoRoot = path.resolve(process.cwd(), "..", envPath);
  if (fs.existsSync(fromCwd)) return fromCwd;
  if (fs.existsSync(fromRepoRoot)) return fromRepoRoot;

  return fromRepoRoot;
}

const DB_PATH = resolveDbPath();

const require = createRequire(import.meta.url);

type SqliteCtor = new (
  filename: string,
  options?: { readonly?: boolean }
) => SqliteDatabase;

function tryGetDb(): SqliteDatabase | null {
  try {
    const BetterSqlite3 = require("better-sqlite3") as SqliteCtor;
    return new BetterSqlite3(DB_PATH, { readonly: true });
  } catch {
    return null;
  }
}

export function getVideos(): VideoItem[] {
  const db = tryGetDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare(
        `SELECT v.*, c.hook, c.script, c.cta, c.category,
                y.youtube_video_id, y.title, y.description as yt_description,
                i.instagram_media_id,
                s.page_title as seo_title, s.meta_description as seo_description,
                s.og_title, s.og_description
         FROM videos v
         JOIN content_items c ON v.content_id = c.id
         LEFT JOIN youtube_uploads y ON y.video_id = v.id
         LEFT JOIN instagram_posts i ON i.video_id = v.id
         LEFT JOIN seo_metadata s ON s.video_id = v.id
         WHERE c.status IN ('posted_instagram', 'posted_youtube', 'completed', 'video_ready', 'video_approved')
         ORDER BY v.created_at DESC`
      )
      .all() as VideoItem[];
    return rows;
  } finally {
    db.close();
  }
}

export function getVideoBySlug(slug: string): VideoItem | undefined {
  const id = parseInt(slug, 10);
  if (isNaN(id)) return undefined;

  const db = tryGetDb();
  if (!db) return undefined;
  try {
    const row = db
      .prepare(
        `SELECT v.*, c.hook, c.script, c.cta, c.category,
                y.youtube_video_id, y.title, y.description as yt_description,
                i.instagram_media_id,
                s.page_title as seo_title, s.meta_description as seo_description,
                s.og_title, s.og_description
         FROM videos v
         JOIN content_items c ON v.content_id = c.id
         LEFT JOIN youtube_uploads y ON y.video_id = v.id
         LEFT JOIN instagram_posts i ON i.video_id = v.id
         LEFT JOIN seo_metadata s ON s.video_id = v.id
         WHERE v.id = ?`
      )
      .get(id) as VideoItem | undefined;
    return row;
  } finally {
    db.close();
  }
}

export interface GeoPage {
  id: number;
  slug: string;
  category: string;
  city: string;
  state: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  intro: string;
  benefits: { title: string; description: string }[];
  cta_text: string;
  local_stat: string;
  created_at: string;
}

export function getGeoPage(slug: string): GeoPage | undefined {
  const db = tryGetDb();
  if (!db) return undefined;
  try {
    const row = db
      .prepare("SELECT * FROM geo_pages WHERE slug = ?")
      .get(slug) as (Omit<GeoPage, "benefits"> & { benefits: string }) | undefined;
    if (!row) return undefined;
    return { ...row, benefits: JSON.parse(row.benefits || "[]") };
  } finally {
    db.close();
  }
}

export function getAllGeoPages(): GeoPage[] {
  const db = tryGetDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare("SELECT * FROM geo_pages ORDER BY category, city")
      .all() as (Omit<GeoPage, "benefits"> & { benefits: string })[];
    return rows.map((r) => ({
      ...r,
      benefits: JSON.parse(r.benefits || "[]"),
    }));
  } catch {
    return [];
  } finally {
    db.close();
  }
}

export function getVideosByCategory(category: string): VideoItem[] {
  const db = tryGetDb();
  if (!db) return [];
  try {
    const rows = db
      .prepare(
        `SELECT v.*, c.hook, c.script, c.cta, c.category,
                y.youtube_video_id, y.title, y.description as yt_description,
                i.instagram_media_id,
                s.page_title as seo_title, s.meta_description as seo_description,
                s.og_title, s.og_description
         FROM videos v
         JOIN content_items c ON v.content_id = c.id
         LEFT JOIN youtube_uploads y ON y.video_id = v.id
         LEFT JOIN instagram_posts i ON i.video_id = v.id
         LEFT JOIN seo_metadata s ON s.video_id = v.id
         WHERE c.category = ?
           AND c.status IN ('posted_instagram', 'posted_youtube', 'completed', 'video_ready', 'video_approved')
         ORDER BY v.created_at DESC`
      )
      .all(category) as VideoItem[];
    return rows;
  } finally {
    db.close();
  }
}
