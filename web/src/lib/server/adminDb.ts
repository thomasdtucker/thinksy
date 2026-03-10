import type { Database as SqliteDatabase } from "better-sqlite3";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { loadRootEnv } from "@/lib/server/loadRootEnv";

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

type SqliteCtor = new (filename: string) => SqliteDatabase;

function getDbWritable() {
  try {
    const BetterSqlite3 = require("better-sqlite3") as SqliteCtor;
    return new BetterSqlite3(DB_PATH);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown DB error";
    throw new Error(`SQLite unavailable: ${msg}`);
  }
}

export type ContentStatus =
  | "idea"
  | "script_draft"
  | "script_approved"
  | "video_generating"
  | "video_ready"
  | "video_approved"
  | "posting"
  | "posted_instagram"
  | "posted_youtube"
  | "completed"
  | "failed";

export interface ScriptRow {
  id: number;
  category: string;
  scene: string | null;
  script_type: string | null;
  hook: string;
  script: string;
  cta: string;
  visual_direction: string;
  target_url: string;
  status: ContentStatus;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface VideoRow {
  id: number;
  content_id: number;
  heygen_video_id: string | null;
  video_path: string | null;
  thumbnail_path: string | null;
  duration_seconds: number;
  status: ContentStatus;
  created_at: string;
  hook: string;
  script: string;
  cta: string;
  category: string;
}

export interface InstagramPostRow {
  id: number;
  video_id: number;
  instagram_media_id: string | null;
  caption: string | null;
  hashtags: string | null;
  posted_at: string | null;
  content_id: number;
  hook: string;
  category: string;
}

export function listScripts(status?: ContentStatus): ScriptRow[] {
  const db = getDbWritable();
  try {
    if (status) {
      return db
        .prepare("SELECT * FROM content_items WHERE status = ? ORDER BY id DESC")
        .all(status) as ScriptRow[];
    }
    return db
      .prepare("SELECT * FROM content_items ORDER BY id DESC")
      .all() as ScriptRow[];
  } finally {
    db.close();
  }
}

export function updateScript(
  id: number,
  patch: Partial<Pick<ScriptRow, "hook" | "script" | "cta" | "visual_direction" | "target_url" | "script_type">>
): void {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (keys.length === 0) return;
  const allowed = new Set([
    "hook",
    "script",
    "cta",
    "visual_direction",
    "target_url",
    "script_type",
  ]);
  for (const k of keys) {
    if (!allowed.has(k as string)) {
      throw new Error(`Invalid patch field: ${String(k)}`);
    }
  }

  const sets = keys.map((k) => `${String(k)} = ?`).join(", ");
  const values = keys.map((k) => patch[k]);

  const db = getDbWritable();
  try {
    db.prepare(`UPDATE content_items SET ${sets} WHERE id = ?`).run(
      ...values,
      id
    );
  } finally {
    db.close();
  }
}

export function setContentStatus(
  id: number,
  status: ContentStatus,
  approvedBy?: string
): void {
  const db = getDbWritable();
  try {
    if (approvedBy) {
      db.prepare(
        "UPDATE content_items SET status = ?, approved_at = datetime('now'), approved_by = ? WHERE id = ?"
      ).run(status, approvedBy, id);
    } else {
      db.prepare("UPDATE content_items SET status = ? WHERE id = ?").run(status, id);
    }
  } finally {
    db.close();
  }
}

export function listVideos(status?: ContentStatus): VideoRow[] {
  const db = getDbWritable();
  try {
    const sql = `SELECT v.*, c.hook, c.script, c.cta, c.category
                 FROM videos v
                 JOIN content_items c ON c.id = v.content_id
                 ${status ? "WHERE v.status = ?" : ""}
                 ORDER BY v.id DESC`;
    const stmt = db.prepare(sql);
    return (status ? stmt.all(status) : stmt.all()) as VideoRow[];
  } finally {
    db.close();
  }
}

export function setVideoStatus(id: number, status: ContentStatus): void {
  const db = getDbWritable();
  try {
    db.prepare("UPDATE videos SET status = ? WHERE id = ?").run(status, id);
  } finally {
    db.close();
  }
}

export function listInstagramPosts(): InstagramPostRow[] {
  const db = getDbWritable();
  try {
    const rows = db
      .prepare(
        `SELECT i.*, v.content_id, c.hook, c.category
         FROM instagram_posts i
         JOIN videos v ON v.id = i.video_id
         JOIN content_items c ON c.id = v.content_id
         ORDER BY i.id DESC`
      )
      .all() as InstagramPostRow[];
    return rows;
  } finally {
    db.close();
  }
}

export function deleteInstagramPost(id: number): void {
  const db = getDbWritable();
  try {
    db.prepare("DELETE FROM instagram_posts WHERE id = ?").run(id);
  } finally {
    db.close();
  }
}
