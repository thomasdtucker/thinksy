from __future__ import annotations

import logging

from ..config import Config
from ..db import Database
from ..models import ContentItem, ContentStatus, Video
from ..shared.storage import download_file
from .heygen_client import HeyGenClient

logger = logging.getLogger(__name__)


class VideoProducerAgent:
    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.heygen = HeyGenClient(
            api_key=config.heygen_api_key,
            avatar_id=config.heygen_avatar_id,
            voice_id=config.heygen_voice_id,
            avatar_scale=config.heygen_avatar_scale,
            video_width=config.heygen_video_width,
            video_height=config.heygen_video_height,
        )
        self._look_ids = config.avatar_look_id_list()
        self._variation_index = 0  # increments with each video to cycle looks

    def generate(self, content: ContentItem) -> Video:
        assert content.id is not None
        self.db.update_content_status(content.id, ContentStatus.VIDEO_GENERATING)

        mode = self.config.heygen_video_mode
        if mode == "agent":
            heygen_video_id, video_url, thumbnail_url = self._generate_agent(content)
        else:
            heygen_video_id, video_url, thumbnail_url = self._generate_avatar(content)

        # Download video locally
        video_path = download_file(
            url=video_url,
            dest_dir=self.config.video_storage_dir,
            filename=f"content_{content.id}.mp4",
        )

        # Download thumbnail if HeyGen provided one
        thumbnail_path = None
        if thumbnail_url:
            thumbnail_path = download_file(
                url=thumbnail_url,
                dest_dir=self.config.video_storage_dir,
                filename=f"content_{content.id}_thumb.jpg",
            )

        video = Video(
            content_id=content.id,
            heygen_video_id=heygen_video_id,
            video_path=video_path,
            thumbnail_path=thumbnail_path,
            status=ContentStatus.VIDEO_READY,
        )
        video.id = self.db.insert_video(video)
        self.db.update_content_status(content.id, ContentStatus.VIDEO_READY)
        self.db.log_action(
            content.id,
            "VideoProducerAgent",
            "video_generated",
            {"video_id": video.id, "path": video_path, "heygen_video_id": heygen_video_id, "mode": mode},
        )

        logger.info("Video #%d generated (%s mode): %s", video.id, mode, video_path)
        return video

    def _generate_avatar(self, content: ContentItem) -> tuple[str, str, str | None]:
        """Classic avatar video: structured scenes with specific avatar + voice."""
        logger.info("Generating avatar video for content #%d", content.id)
        result = self.heygen.generate_video(
            script=content.script,
            title=f"content_{content.id}",
            look_ids=self._look_ids,
            variation_index=self._variation_index,
        )
        self._variation_index += 1
        return result

    _OUTFITS = [
        "a tan blazer",
        "a white blouse",
        "a green blazer",
        "a tan cardigan",
        "a white blazer",
        "a green blouse",
    ]

    def _generate_agent(self, content: ContentItem) -> tuple[str, str, str | None]:
        """AI Video Agent: prompt-driven with auto transitions, graphics, and music."""
        parts = [
            "Create a professional short-form video ad in portrait orientation (9:16 aspect ratio)."
            " Target duration is approximately 20 seconds across 3–4 scenes."
            " Language: English. Do not include captions.",
            "",
            f"Script: {content.script}",
            "",
            "Style: Professional, trustworthy, and clean corporate aesthetic."
            " Soft office background.",
            "",
            f"Avatar: Evelyn Hartwell — a professional woman wearing"
            f" {self._OUTFITS[self._variation_index % len(self._OUTFITS)]},"
            f" an HR expert with 40 years of experience."
            f" Voice should be professional and knowledgeable.",
        ]
        if content.visual_direction:
            parts.append(f"\nVisual direction: {content.visual_direction}")
        if content.cta:
            parts.append(f"\nEnd with a clear call to action: {content.cta}")
        parts.append(
            "\nAdd smooth transitions between scenes, relevant supporting graphics,"
            " and fitting professional background music."
        )
        prompt = "\n".join(parts)
        
        logger.info("Generating Video Agent video for content #%d (outfit: %s)",
                    content.id, self._OUTFITS[self._variation_index % len(self._OUTFITS)])
        avatar_id = self._look_ids[self._variation_index % len(self._look_ids)] if self._look_ids else self.config.heygen_avatar_id
        result = self.heygen.generate_video_agent(prompt=prompt, avatar_id=avatar_id or None)
        self._variation_index += 1
        return result

    def generate_avatar_image(self, prompt: str) -> str:
        """Generate a still image of the avatar persona and save it locally.

        Uses the HeyGen Photo Avatar looks API. Requires HEYGEN_AVATAR_GROUP_ID
        to be configured. Returns the local file path.
        """
        if not self.config.heygen_avatar_group_id:
            raise ValueError("HEYGEN_AVATAR_GROUP_ID must be set to generate avatar images")

        image_url = self.heygen.generate_avatar_image(
            group_id=self.config.heygen_avatar_group_id,
            prompt=prompt,
        )

        # Use a timestamp-based filename so repeated calls don't overwrite
        import time
        filename = f"avatar_{int(time.time())}.jpg"
        image_path = download_file(
            url=image_url,
            dest_dir=self.config.avatar_storage_dir,
            filename=filename,
        )
        logger.info("Avatar image saved: %s", image_path)
        return image_path
