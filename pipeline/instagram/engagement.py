from __future__ import annotations

import logging
import random
import time

import requests

from ..config import Config
from ..shared.llm import ClaudeClient

logger = logging.getLogger(__name__)

# Conservative rate limits to avoid Instagram detection
MAX_ACTIONS_PER_HOUR = 12
MIN_DELAY_BETWEEN_ACTIONS = 180  # 3 minutes

COMMENT_SYSTEM = """You write genuine, helpful Instagram comments on posts about business software.
Comments should be relevant, add value, and not be obviously promotional.
Keep comments 1-2 sentences. Sound like a real person, not a bot.
Never mention specific products or URLs in comments."""

COMMENT_PROMPT = """Write a genuine comment for this Instagram post about {topic}.
Post caption excerpt: {caption_excerpt}

Return just the comment text."""


class EngagementAgent:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.llm = ClaudeClient(config.anthropic_api_key)
        self.access_token = config.instagram_access_token
        self.ig_user_id = config.instagram_user_id
        self.api_version = config.graph_api_version
        self._actions_this_hour = 0
        self._hour_start = time.time()

    def _check_rate_limit(self) -> bool:
        now = time.time()
        if now - self._hour_start > 3600:
            self._actions_this_hour = 0
            self._hour_start = now

        if self._actions_this_hour >= MAX_ACTIONS_PER_HOUR:
            logger.warning("Rate limit reached (%d actions this hour)", self._actions_this_hour)
            return False
        return True

    def _record_action(self) -> None:
        self._actions_this_hour += 1
        delay = MIN_DELAY_BETWEEN_ACTIONS + random.randint(0, 120)
        logger.info("Action recorded. Waiting %ds before next action.", delay)
        time.sleep(delay)

    def search_hashtag(self, hashtag: str) -> list[dict]:
        """Search for recent media by hashtag via Instagram Graph API."""
        # Step 1: Get hashtag ID
        resp = requests.get(
            f"https://graph.facebook.com/{self.api_version}/ig_hashtag_search",
            params={
                "q": hashtag,
                "user_id": self.ig_user_id,
                "access_token": self.access_token,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])
        if not data:
            return []

        hashtag_id = data[0]["id"]

        # Step 2: Get recent media for that hashtag
        resp = requests.get(
            f"https://graph.facebook.com/{self.api_version}/{hashtag_id}/recent_media",
            params={
                "user_id": self.ig_user_id,
                "fields": "id,caption,media_type",
                "access_token": self.access_token,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def comment_on_media(self, media_id: str, topic: str, caption_excerpt: str) -> bool:
        """Post a genuine comment on a media item."""
        if not self._check_rate_limit():
            return False

        comment_text = self.llm.chat(
            system=COMMENT_SYSTEM,
            user=COMMENT_PROMPT.format(topic=topic, caption_excerpt=caption_excerpt),
        )

        resp = requests.post(
            f"https://graph.facebook.com/{self.api_version}/{media_id}/comments",
            data={
                "message": comment_text,
                "access_token": self.access_token,
            },
            timeout=30,
        )

        if resp.status_code == 200:
            logger.info("Commented on %s: %s", media_id, comment_text[:50])
            self._record_action()
            return True
        else:
            logger.warning("Comment failed on %s: %s", media_id, resp.text)
            return False

    def engage_with_hashtags(self, hashtags: list[str], max_comments: int = 5) -> int:
        """Find posts by hashtag and leave genuine comments."""
        total_comments = 0
        for hashtag in hashtags:
            if total_comments >= max_comments:
                break
            if not self._check_rate_limit():
                break

            media_items = self.search_hashtag(hashtag)
            for media in media_items[:2]:
                if total_comments >= max_comments:
                    break
                caption = media.get("caption", "")[:200]
                success = self.comment_on_media(media["id"], hashtag, caption)
                if success:
                    total_comments += 1

        logger.info("Engagement round complete: %d comments posted", total_comments)
        return total_comments
