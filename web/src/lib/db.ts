import Database from "better-sqlite3";
import path from "path";
import type { VideoItem } from "./types";

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "..", "data", "thinksy.db");

export function getVideos(): VideoItem[] {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const rows = db
      .prepare(
        `SELECT v.*, c.hook, c.script, c.cta, c.category,
                y.youtube_video_id, y.title, y.description as yt_description,
                i.instagram_media_id
         FROM videos v
         JOIN content_items c ON v.content_id = c.id
         LEFT JOIN youtube_uploads y ON y.video_id = v.id
         LEFT JOIN instagram_posts i ON i.video_id = v.id
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

  const db = new Database(DB_PATH, { readonly: true });
  try {
    const row = db
      .prepare(
        `SELECT v.*, c.hook, c.script, c.cta, c.category,
                y.youtube_video_id, y.title, y.description as yt_description,
                i.instagram_media_id
         FROM videos v
         JOIN content_items c ON v.content_id = c.id
         LEFT JOIN youtube_uploads y ON y.video_id = v.id
         LEFT JOIN instagram_posts i ON i.video_id = v.id
         WHERE v.id = ?`
      )
      .get(id) as VideoItem | undefined;
    return row;
  } finally {
    db.close();
  }
}
