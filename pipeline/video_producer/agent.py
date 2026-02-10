from __future__ import annotations

import logging

from ..config import Config
from ..db import Database
from ..models import ContentItem, ContentStatus, Video
from ..shared.llm import ClaudeClient
from ..shared.storage import download_file
from .runway_client import RunwayClient

logger = logging.getLogger(__name__)

VISUAL_PROMPT_SYSTEM = """You convert video ad scripts into concise image generation prompts.
Focus on creating a professional, clean B2B SaaS aesthetic.
The image should be a single compelling frame that can serve as the starting point
for a short animated video ad.
Keep the prompt under 100 words. Do not include text overlays in the prompt."""


class VideoProducerAgent:
    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.llm = ClaudeClient(config.anthropic_api_key)
        self.runway = RunwayClient(config.runway_api_key)

    def generate(self, content: ContentItem) -> Video:
        assert content.id is not None
        self.db.update_content_status(content.id, ContentStatus.VIDEO_GENERATING)

        # Step 1: Create a visual prompt from the script
        visual_prompt = self._create_visual_prompt(content)

        # Step 2: Generate starting frame image
        logger.info("Generating starting frame for content #%d", content.id)
        image_url = self.runway.generate_image(visual_prompt)

        # Step 3: Generate video from image + script
        video_prompt = f"{content.hook} {content.script[:100]}"
        logger.info("Generating video for content #%d", content.id)
        video_url = self.runway.generate_video(
            prompt_image_url=image_url,
            prompt_text=video_prompt,
            duration=5,
            ratio="1080:1920",
        )

        # Step 4: Download video locally
        video_path = download_file(
            url=video_url,
            dest_dir=self.config.video_storage_dir,
            filename=f"content_{content.id}.mp4",
        )

        video = Video(
            content_id=content.id,
            video_path=video_path,
            status=ContentStatus.VIDEO_READY,
        )
        video.id = self.db.insert_video(video)
        self.db.update_content_status(content.id, ContentStatus.VIDEO_READY)
        self.db.log_action(
            content.id,
            "VideoProducerAgent",
            "video_generated",
            {"video_id": video.id, "path": video_path},
        )

        logger.info("Video #%d generated: %s", video.id, video_path)
        return video

    def _create_visual_prompt(self, content: ContentItem) -> str:
        return self.llm.chat(
            system=VISUAL_PROMPT_SYSTEM,
            user=(
                f"Create an image prompt for this ad.\n"
                f"Hook: {content.hook}\n"
                f"Script: {content.script}\n"
                f"Category: {content.category.value}\n"
                f"Visual direction: {content.visual_direction}"
            ),
        )
