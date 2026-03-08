from __future__ import annotations

import json
import logging
from pathlib import Path

from .db import Database

logger = logging.getLogger(__name__)


def export_site_data(db: Database, output_dir: str) -> dict[str, int]:
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    videos_path = out_dir / "videos.json"
    geo_pages_path = out_dir / "geo-pages.json"

    raw_videos = db.get_all_posted_videos()
    videos: list[dict] = []

    for video in raw_videos:
        seo = db.get_seo_metadata(video["id"]) or {}
        videos.append(
            {
                "id": video["id"],
                "content_id": video["content_id"],
                "video_path": video.get("video_path"),
                "thumbnail_path": video.get("thumbnail_path"),
                "duration_seconds": video.get("duration_seconds") or 0,
                "created_at": video["created_at"],
                "hook": video.get("hook") or "",
                "script": video.get("script") or "",
                "cta": video.get("cta") or "",
                "category": video.get("category"),
                "youtube_video_id": video.get("youtube_video_id"),
                "title": video.get("title"),
                "yt_description": video.get("yt_description"),
                "instagram_media_id": video.get("instagram_media_id"),
                "seo_title": seo.get("page_title"),
                "seo_description": seo.get("meta_description"),
                "og_title": seo.get("og_title"),
                "og_description": seo.get("og_description"),
            }
        )

    geo_pages = db.get_all_geo_pages()

    videos_path.write_text(json.dumps(videos, indent=2), encoding="utf-8")
    geo_pages_path.write_text(json.dumps(geo_pages, indent=2), encoding="utf-8")

    logger.info("Exported %s videos to %s", len(videos), videos_path)
    logger.info("Exported %s geo pages to %s", len(geo_pages), geo_pages_path)

    return {"videos": len(videos), "geo_pages": len(geo_pages)}
