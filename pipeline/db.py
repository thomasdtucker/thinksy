from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    ContentItem,
    ContentStatus,
    InstagramPost,
    Video,
    YouTubeUpload,
)

SCHEMA = """
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
"""


class Database:
    def __init__(self, db_path: str) -> None:
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._init_schema()

    def _init_schema(self) -> None:
        self.conn.executescript(SCHEMA)
        # Idempotent migrations for columns added after initial release
        migrations = [
            "ALTER TABLE content_items ADD COLUMN script_type TEXT",
        ]
        for sql in migrations:
            try:
                self.conn.execute(sql)
            except Exception:
                pass  # Column already exists
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # --- Content Items ---

    def insert_content_item(self, item: ContentItem) -> int:
        cur = self.conn.execute(
            """INSERT INTO content_items
               (category, script_type, hook, script, cta, visual_direction, target_url, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                item.category.value,
                item.script_type,
                item.hook,
                item.script,
                item.cta,
                item.visual_direction,
                item.target_url,
                item.status.value,
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def get_content_item(self, item_id: int) -> Optional[ContentItem]:
        row = self.conn.execute(
            "SELECT * FROM content_items WHERE id = ?", (item_id,)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_content_item(row)

    def get_items_by_status(self, status: ContentStatus) -> list[ContentItem]:
        rows = self.conn.execute(
            "SELECT * FROM content_items WHERE status = ? ORDER BY id",
            (status.value,),
        ).fetchall()
        return [self._row_to_content_item(r) for r in rows]

    def update_content_status(
        self,
        item_id: int,
        status: ContentStatus,
        approved_by: Optional[str] = None,
    ) -> None:
        if approved_by:
            self.conn.execute(
                "UPDATE content_items SET status=?, approved_at=?, approved_by=? WHERE id=?",
                (status.value, datetime.now().isoformat(), approved_by, item_id),
            )
        else:
            self.conn.execute(
                "UPDATE content_items SET status=? WHERE id=?",
                (status.value, item_id),
            )
        self.conn.commit()

    # --- Videos ---

    def insert_video(self, video: Video) -> int:
        cur = self.conn.execute(
            """INSERT INTO videos
               (content_id, heygen_video_id, video_path, thumbnail_path, duration_seconds, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                video.content_id,
                video.heygen_video_id,
                video.video_path,
                video.thumbnail_path,
                video.duration_seconds,
                video.status.value,
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def get_video(self, video_id: int) -> Optional[Video]:
        row = self.conn.execute(
            "SELECT * FROM videos WHERE id = ?", (video_id,)
        ).fetchone()
        if row is None:
            return None
        return self._row_to_video(row)

    def get_video_by_content_id(self, content_id: int) -> Optional[Video]:
        row = self.conn.execute(
            "SELECT * FROM videos WHERE content_id = ? ORDER BY id DESC LIMIT 1",
            (content_id,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_video(row)

    def get_videos_by_status(self, status: ContentStatus) -> list[Video]:
        rows = self.conn.execute(
            "SELECT * FROM videos WHERE status = ? ORDER BY id",
            (status.value,),
        ).fetchall()
        return [self._row_to_video(r) for r in rows]

    def update_video(self, video_id: int, **kwargs: object) -> None:
        sets = ", ".join(f"{k}=?" for k in kwargs)
        vals = list(kwargs.values()) + [video_id]
        self.conn.execute(f"UPDATE videos SET {sets} WHERE id=?", vals)
        self.conn.commit()

    # --- Instagram Posts ---

    def insert_instagram_post(self, post: InstagramPost) -> int:
        cur = self.conn.execute(
            """INSERT INTO instagram_posts
               (video_id, instagram_media_id, caption, hashtags, posted_at)
               VALUES (?, ?, ?, ?, ?)""",
            (
                post.video_id,
                post.instagram_media_id,
                post.caption,
                json.dumps(post.hashtags),
                post.posted_at.isoformat() if post.posted_at else None,
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    # --- YouTube Uploads ---

    def insert_youtube_upload(self, upload: YouTubeUpload) -> int:
        cur = self.conn.execute(
            """INSERT INTO youtube_uploads
               (video_id, youtube_video_id, title, description, tags, posted_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                upload.video_id,
                upload.youtube_video_id,
                upload.title,
                upload.description,
                json.dumps(upload.tags),
                upload.posted_at.isoformat() if upload.posted_at else None,
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    # --- Workflow Log ---

    def log_action(
        self, content_id: int, agent: str, action: str, details: dict
    ) -> None:
        self.conn.execute(
            "INSERT INTO workflow_log (content_id, agent, action, details) VALUES (?, ?, ?, ?)",
            (content_id, agent, action, json.dumps(details)),
        )
        self.conn.commit()

    # --- Stats ---

    def get_status_counts(self) -> dict[str, int]:
        rows = self.conn.execute(
            "SELECT status, COUNT(*) as cnt FROM content_items GROUP BY status"
        ).fetchall()
        return {row["status"]: row["cnt"] for row in rows}

    def get_all_posted_videos(self) -> list[dict]:
        rows = self.conn.execute(
            """SELECT v.*, c.hook, c.script, c.cta, c.category,
                      y.youtube_video_id, y.title, y.description as yt_description,
                      i.instagram_media_id
               FROM videos v
               JOIN content_items c ON v.content_id = c.id
               LEFT JOIN youtube_uploads y ON y.video_id = v.id
               LEFT JOIN instagram_posts i ON i.video_id = v.id
               WHERE c.status IN ('posted_instagram', 'posted_youtube', 'completed')
               ORDER BY v.created_at DESC"""
        ).fetchall()
        return [dict(r) for r in rows]

    def get_unposted_videos(self, platform: str = "both") -> list[Video]:
        """Find videos that exist but haven't been posted to one or both platforms.

        Looks across all 'ready' statuses (video_approved, posted_instagram,
        posted_youtube, completed) for videos missing platform records.
        """
        if platform == "instagram":
            rows = self.conn.execute(
                """SELECT v.* FROM videos v
                   JOIN content_items c ON v.content_id = c.id
                   LEFT JOIN instagram_posts i ON i.video_id = v.id
                   WHERE i.id IS NULL
                   AND c.status IN ('video_approved', 'posted_youtube', 'completed')
                   ORDER BY v.id""",
            ).fetchall()
        elif platform == "youtube":
            rows = self.conn.execute(
                """SELECT v.* FROM videos v
                   JOIN content_items c ON v.content_id = c.id
                   LEFT JOIN youtube_uploads y ON y.video_id = v.id
                   WHERE y.id IS NULL
                   AND c.status IN ('video_approved', 'posted_instagram', 'completed')
                   ORDER BY v.id""",
            ).fetchall()
        else:
            # 'both': videos missing either instagram or youtube
            rows = self.conn.execute(
                """SELECT DISTINCT v.* FROM videos v
                   JOIN content_items c ON v.content_id = c.id
                   LEFT JOIN instagram_posts i ON i.video_id = v.id
                   LEFT JOIN youtube_uploads y ON y.video_id = v.id
                   WHERE (i.id IS NULL OR y.id IS NULL)
                   AND c.status IN ('video_approved', 'posted_instagram', 'posted_youtube', 'completed')
                   ORDER BY v.id""",
            ).fetchall()
        return [self._row_to_video(r) for r in rows]

    # --- SEO Metadata ---

    def upsert_seo_metadata(self, video_id: int, data: dict) -> None:
        self.conn.execute(
            """INSERT INTO seo_metadata
               (video_id, page_title, meta_description, focus_keywords, og_title, og_description)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(video_id) DO UPDATE SET
               page_title=excluded.page_title,
               meta_description=excluded.meta_description,
               focus_keywords=excluded.focus_keywords,
               og_title=excluded.og_title,
               og_description=excluded.og_description""",
            (
                video_id,
                data.get("page_title", ""),
                data.get("meta_description", ""),
                json.dumps(data.get("focus_keywords", [])),
                data.get("og_title", ""),
                data.get("og_description", ""),
            ),
        )
        self.conn.commit()

    def get_seo_metadata(self, video_id: int) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT * FROM seo_metadata WHERE video_id = ?", (video_id,)
        ).fetchone()
        if row is None:
            return None
        return dict(row)

    # --- Geo Pages ---

    def insert_geo_page(self, data: dict) -> int:
        cur = self.conn.execute(
            """INSERT INTO geo_pages
               (slug, category, city, state, h1, meta_title, meta_description,
                intro, benefits, cta_text, local_stat)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data["slug"],
                data["category"],
                data["city"],
                data["state"],
                data.get("h1", ""),
                data.get("meta_title", ""),
                data.get("meta_description", ""),
                data.get("intro", ""),
                json.dumps(data.get("benefits", [])),
                data.get("cta_text", ""),
                data.get("local_stat", ""),
            ),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def get_geo_page(self, slug: str) -> Optional[dict]:
        row = self.conn.execute(
            "SELECT * FROM geo_pages WHERE slug = ?", (slug,)
        ).fetchone()
        if row is None:
            return None
        result = dict(row)
        result["benefits"] = json.loads(result.get("benefits") or "[]")
        return result

    def get_all_geo_pages(self) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM geo_pages ORDER BY category, city"
        ).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["benefits"] = json.loads(r.get("benefits") or "[]")
            results.append(r)
        return results

    def get_geo_pages_by_category(self, category: str) -> list[dict]:
        rows = self.conn.execute(
            "SELECT * FROM geo_pages WHERE category = ? ORDER BY city",
            (category,),
        ).fetchall()
        results = []
        for row in rows:
            r = dict(row)
            r["benefits"] = json.loads(r.get("benefits") or "[]")
            results.append(r)
        return results

    # --- Helpers ---

    @staticmethod
    def _row_to_content_item(row: sqlite3.Row) -> ContentItem:
        return ContentItem(
            id=row["id"],
            category=row["category"],
            script_type=row["script_type"],
            hook=row["hook"],
            script=row["script"],
            cta=row["cta"],
            visual_direction=row["visual_direction"] or "",
            target_url=row["target_url"],
            status=row["status"],
            created_at=row["created_at"],
            approved_at=row["approved_at"],
            approved_by=row["approved_by"],
        )

    @staticmethod
    def _row_to_video(row: sqlite3.Row) -> Video:
        return Video(
            id=row["id"],
            content_id=row["content_id"],
            heygen_video_id=row["heygen_video_id"],
            video_path=row["video_path"],
            thumbnail_path=row["thumbnail_path"],
            duration_seconds=row["duration_seconds"],
            status=row["status"],
            created_at=row["created_at"],
        )
