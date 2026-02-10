from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from ..config import Config
from ..db import Database
from ..models import ContentItem, ContentStatus, Video, YouTubeUpload
from ..shared.llm import ClaudeClient
from .seo import generate_youtube_metadata

logger = logging.getLogger(__name__)


class YouTubeAgent:
    SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.llm = ClaudeClient(config.anthropic_api_key)

    def upload(self, video: Video, content: ContentItem) -> YouTubeUpload:
        assert video.id is not None
        assert content.id is not None
        assert video.video_path is not None

        # Generate SEO metadata
        metadata = generate_youtube_metadata(self.llm, content)

        # Get authenticated YouTube service
        youtube = self._get_service()

        # Upload
        body = {
            "snippet": {
                "title": metadata["title"],
                "description": metadata["description"],
                "tags": metadata["tags"],
                "categoryId": "28",  # Science & Technology
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False,
            },
        }

        media = MediaFileUpload(
            video.video_path,
            mimetype="video/mp4",
            resumable=True,
        )

        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )

        response = self._resumable_upload(request)
        youtube_video_id = response["id"]

        upload = YouTubeUpload(
            video_id=video.id,
            youtube_video_id=youtube_video_id,
            title=metadata["title"],
            description=metadata["description"],
            tags=metadata["tags"],
            posted_at=datetime.now(),
        )
        upload.id = self.db.insert_youtube_upload(upload)
        self.db.update_content_status(content.id, ContentStatus.POSTED_YOUTUBE)
        self.db.log_action(
            content.id,
            "YouTubeAgent",
            "uploaded_video",
            {"upload_id": upload.id, "youtube_id": youtube_video_id},
        )

        logger.info(
            "Uploaded to YouTube: %s (https://youtube.com/shorts/%s)",
            metadata["title"],
            youtube_video_id,
        )
        return upload

    def _get_service(self):
        creds = Credentials(
            token=None,
            refresh_token=self.config.youtube_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.config.youtube_client_id,
            client_secret=self.config.youtube_client_secret,
        )
        return build("youtube", "v3", credentials=creds)

    def _resumable_upload(self, request) -> dict:
        """Execute a resumable upload with retry."""
        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                logger.info("Upload progress: %d%%", int(status.progress() * 100))
        logger.info("Upload complete")
        return response
