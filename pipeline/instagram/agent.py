from __future__ import annotations

import logging
import time

import requests

from ..config import Config
from ..db import Database
from ..models import ContentItem, ContentStatus, InstagramPost, Video
from ..shared.llm import ClaudeClient
from .hashtags import generate_hashtags

logger = logging.getLogger(__name__)

CAPTION_SYSTEM = """You write Instagram Reels captions for B2B software ads.
Captions should be engaging, use line breaks for readability, include a clear CTA,
and mention www.softwareadvice.com. Keep captions under 150 words.
Do NOT include hashtags — those are added separately."""

CAPTION_PROMPT = """Write an Instagram Reels caption for this ad:

Category: {category}
Hook: {hook}
Script: {script}
CTA: {cta}

Return just the caption text, no JSON."""


class InstagramAgent:
    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.llm = ClaudeClient(config.anthropic_api_key)
        self.ig_user_id = config.instagram_user_id
        self.access_token = config.instagram_access_token

    def post(self, video: Video, content: ContentItem) -> InstagramPost:
        assert video.id is not None
        assert content.id is not None

        # Generate caption
        caption = self.llm.chat(
            system=CAPTION_SYSTEM,
            user=CAPTION_PROMPT.format(
                category=content.category.value,
                hook=content.hook,
                script=content.script,
                cta=content.cta,
            ),
        )

        # Generate hashtags
        hashtags = generate_hashtags(
            self.llm, content.category, content.hook, content.script
        )
        hashtag_str = " ".join(f"#{tag}" for tag in hashtags[:25])
        full_caption = f"{caption}\n\n{hashtag_str}"

        # Post via Instagram Graph API
        media_id = self._publish_reel(video, full_caption)

        post = InstagramPost(
            video_id=video.id,
            instagram_media_id=media_id,
            caption=full_caption,
            hashtags=hashtags,
        )
        from datetime import datetime
        post.posted_at = datetime.now()
        post.id = self.db.insert_instagram_post(post)
        self.db.update_content_status(content.id, ContentStatus.POSTED_INSTAGRAM)
        self.db.log_action(
            content.id,
            "InstagramAgent",
            "posted_reel",
            {"post_id": post.id, "media_id": media_id},
        )

        logger.info("Posted reel for content #%d, media_id=%s", content.id, media_id)
        return post

    def _publish_reel(self, video: Video, caption: str) -> str:
        """Publish a reel via Instagram Graph API (2-step process)."""
        # The video must be at a publicly accessible URL.
        # For local files, you'd need to host them first.
        video_url = f"{self.config.public_video_host}/videos/content_{video.content_id}.mp4"

        # Step 1: Create media container
        resp = requests.post(
            f"https://graph.facebook.com/v21.0/{self.ig_user_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": self.access_token,
            },
            timeout=60,
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]
        logger.info("Created media container: %s", container_id)

        # Step 2: Wait for container to be ready, then publish
        self._wait_for_container(container_id)

        resp = requests.post(
            f"https://graph.facebook.com/v21.0/{self.ig_user_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": self.access_token,
            },
            timeout=60,
        )
        resp.raise_for_status()
        media_id = resp.json()["id"]
        logger.info("Published reel: %s", media_id)
        return media_id

    def _wait_for_container(self, container_id: str, timeout: int = 300) -> None:
        """Poll container status until FINISHED."""
        start = time.time()
        while time.time() - start < timeout:
            resp = requests.get(
                f"https://graph.facebook.com/v21.0/{container_id}",
                params={
                    "fields": "status_code",
                    "access_token": self.access_token,
                },
                timeout=30,
            )
            resp.raise_for_status()
            status = resp.json().get("status_code")
            if status == "FINISHED":
                return
            if status == "ERROR":
                raise RuntimeError(f"Instagram container {container_id} failed")
            time.sleep(10)
        raise TimeoutError(f"Instagram container {container_id} timed out")
