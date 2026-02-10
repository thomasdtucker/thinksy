from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ContentStatus(str, Enum):
    IDEA = "idea"
    SCRIPT_DRAFT = "script_draft"
    SCRIPT_APPROVED = "script_approved"
    VIDEO_GENERATING = "video_generating"
    VIDEO_READY = "video_ready"
    VIDEO_APPROVED = "video_approved"
    POSTING = "posting"
    POSTED_INSTAGRAM = "posted_instagram"
    POSTED_YOUTUBE = "posted_youtube"
    COMPLETED = "completed"
    FAILED = "failed"


class SoftwareCategory(str, Enum):
    HR = "hr"
    ACCOUNTING = "accounting"
    PROJECT_MANAGEMENT = "project_management"


class ContentItem(BaseModel):
    id: Optional[int] = None
    category: SoftwareCategory
    hook: str
    script: str
    cta: str
    visual_direction: str = ""
    target_url: str = "https://www.softwareadvice.com"
    status: ContentStatus = ContentStatus.IDEA
    created_at: datetime = Field(default_factory=datetime.now)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None


class Video(BaseModel):
    id: Optional[int] = None
    content_id: int
    runway_task_id: Optional[str] = None
    video_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    duration_seconds: float = 5.0
    status: ContentStatus = ContentStatus.VIDEO_GENERATING
    created_at: datetime = Field(default_factory=datetime.now)


class InstagramPost(BaseModel):
    id: Optional[int] = None
    video_id: int
    instagram_media_id: Optional[str] = None
    caption: str
    hashtags: list[str] = Field(default_factory=list)
    posted_at: Optional[datetime] = None


class YouTubeUpload(BaseModel):
    id: Optional[int] = None
    video_id: int
    youtube_video_id: Optional[str] = None
    title: str
    description: str
    tags: list[str] = Field(default_factory=list)
    posted_at: Optional[datetime] = None
