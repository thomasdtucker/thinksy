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
    runway_task_id TEXT,
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
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # --- Content Items ---

    def insert_content_item(self, item: ContentItem) -> int:
        cur = self.conn.execute(
            """INSERT INTO content_items
               (category, hook, script, cta, visual_direction, target_url, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                item.category.value,
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
               (content_id, runway_task_id, video_path, thumbnail_path, duration_seconds, status)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                video.content_id,
                video.runway_task_id,
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

    # --- Helpers ---

    @staticmethod
    def _row_to_content_item(row: sqlite3.Row) -> ContentItem:
        return ContentItem(
            id=row["id"],
            category=row["category"],
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
            runway_task_id=row["runway_task_id"],
            video_path=row["video_path"],
            thumbnail_path=row["thumbnail_path"],
            duration_seconds=row["duration_seconds"],
            status=row["status"],
            created_at=row["created_at"],
        )
