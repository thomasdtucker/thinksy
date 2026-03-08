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
Captions should be engaging, use line breaks for readability, and include a clear
call to action directing viewers to the link in bio. Never write a raw URL in the
caption—instead use phrases like "link in bio," "tap the link in my bio," or
"link's in my bio." Keep captions under 150 words.
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
        self.api_version = config.graph_api_version

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

        # Also post the video as a Story for extra reach
        try:
            self._publish_story(video)
            logger.info("Posted story for content #%d", content.id)
        except Exception as e:
            # Story posting is best-effort — don't fail the whole post
            logger.warning("Story posting failed for content #%d: %s", content.id, e)

        return post

    def _publish_reel(self, video: Video, caption: str) -> str:
        """Publish a reel via Instagram Graph API (2-step process)."""
        # The video must be at a publicly accessible URL.
        # For local files, you'd need to host them first.
        video_url = f"{self.config.public_video_host}/media/videos/content_{video.content_id}.mp4"

        # Step 1: Create media container
        resp = requests.post(
            f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": self.access_token,
            },
            timeout=60,
        )
        if not resp.ok:
            body = resp.text
            logger.error("Instagram container creation failed (%d): %s", resp.status_code, body)
            resp.raise_for_status()
        container_id = resp.json()["id"]
        logger.info("Created media container: %s (video_url=%s)", container_id, video_url)

        # Step 2: Wait for container to be ready, then publish
        self._wait_for_container(container_id)

        resp = requests.post(
            f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": self.access_token,
            },
            timeout=60,
        )
        if not resp.ok:
            body = resp.text
            logger.error("Instagram publish failed (%d): %s", resp.status_code, body)
            resp.raise_for_status()
        media_id = resp.json()["id"]
        logger.info("Published reel: %s", media_id)
        return media_id

    def _wait_for_container(self, container_id: str, timeout: int = 300) -> None:
        """Poll container status until FINISHED."""
        start = time.time()
        while time.time() - start < timeout:
            resp = requests.get(
                f"https://graph.facebook.com/{self.api_version}/{container_id}",
                params={
                    "fields": "status_code",
                    "access_token": self.access_token,
                },
                timeout=30,
            )
            if not resp.ok:
                body = resp.text
                logger.error("Container status check failed (%d): %s", resp.status_code, body)
                resp.raise_for_status()
            status = resp.json().get("status_code")
            if status == "FINISHED":
                return
            if status == "ERROR":
                error_msg = resp.json().get("status", "unknown error")
                raise RuntimeError(f"Instagram container {container_id} failed: {error_msg}")
            time.sleep(10)
        raise TimeoutError(f"Instagram container {container_id} timed out")

    def _publish_story(self, video: Video) -> str:
        """Publish the video as an Instagram Story for additional reach.

        Note: Link stickers are NOT supported via the Graph API.
        Stories are posted as plain video to boost visibility and drive
        viewers to the profile (and the link in bio).
        """
        video_url = f"{self.config.public_video_host}/media/videos/content_{video.content_id}.mp4"

        # Step 1: Create Story container (no caption support for Stories)
        resp = requests.post(
            f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media",
            data={
                "media_type": "STORIES",
                "video_url": video_url,
                "access_token": self.access_token,
            },
            timeout=60,
        )
        if not resp.ok:
            body = resp.text
            logger.error("Story container creation failed (%d): %s", resp.status_code, body)
            resp.raise_for_status()
        container_id = resp.json()["id"]
        logger.info("Created story container: %s", container_id)

        # Step 2: Wait and publish
        self._wait_for_container(container_id)

        resp = requests.post(
            f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": self.access_token,
            },
            timeout=60,
        )
        if not resp.ok:
            body = resp.text
            logger.error("Story publish failed (%d): %s", resp.status_code, body)
            resp.raise_for_status()
        media_id = resp.json()["id"]
        logger.info("Published story: %s", media_id)
        return media_id
