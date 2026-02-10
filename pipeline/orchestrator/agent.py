from __future__ import annotations

import logging
from typing import Optional

from rich.console import Console

from ..config import Config
from ..content_strategist.agent import ContentStrategistAgent
from ..db import Database
from ..instagram.agent import InstagramAgent
from ..models import ContentItem, ContentStatus, SoftwareCategory, Video
from ..video_producer.agent import VideoProducerAgent
from ..youtube.agent import YouTubeAgent
from .approval import approval_gate, display_content_for_review

console = Console()
logger = logging.getLogger(__name__)


class OrchestratorAgent:
    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.content_agent = ContentStrategistAgent(config, db)
        self.video_agent = VideoProducerAgent(config, db)
        self.instagram_agent = InstagramAgent(config, db)
        self.youtube_agent = YouTubeAgent(config, db)

    def run_pipeline(
        self,
        instruction: str,
        count: int = 3,
        category: Optional[SoftwareCategory] = None,
        skip_video: bool = False,
        skip_post: bool = False,
    ) -> list[Video]:
        """Full pipeline: generate ideas → scripts → videos → post."""
        console.print(f"\n[bold blue]Thinksy Pipeline[/bold blue]")
        console.print(f"Instruction: {instruction}")
        console.print(f"Count: {count}")
        console.print(f"Approval mode: {self.config.approval_mode}\n")

        # Step 1: Generate content scripts
        console.print("[bold]Step 1: Generating ad scripts...[/bold]")
        content_items = self.content_agent.generate(instruction, count, category)
        console.print(f"[green]Generated {len(content_items)} scripts[/green]\n")

        # Step 2: Approval gate for scripts
        approved_scripts = approval_gate(
            content_items, "script", self.config.approval_mode, self.db
        )
        for item in approved_scripts:
            self.db.update_content_status(
                item.id,
                ContentStatus.SCRIPT_APPROVED,
                approved_by=self.config.approval_mode,
            )

        if not approved_scripts:
            console.print("[red]No scripts approved. Pipeline stopped.[/red]")
            return []

        if skip_video:
            console.print("[yellow]Skipping video generation (--skip-video)[/yellow]")
            return []

        # Step 3: Generate videos
        console.print("[bold]Step 3: Generating videos...[/bold]")
        videos: list[Video] = []
        for item in approved_scripts:
            try:
                video = self.video_agent.generate(item)
                videos.append(video)
            except Exception as e:
                console.print(f"[red]Video generation failed for #{item.id}: {e}[/red]")
                logger.exception("Video generation failed for content #%d", item.id)

        if not videos:
            console.print("[red]No videos generated. Pipeline stopped.[/red]")
            return []

        # Step 4: Approval gate for videos
        approved_videos = approval_gate(
            videos, "video", self.config.approval_mode, self.db
        )
        for video in approved_videos:
            self.db.update_video(
                video.id, status=ContentStatus.VIDEO_APPROVED.value
            )
            self.db.update_content_status(
                video.content_id, ContentStatus.VIDEO_APPROVED
            )

        if not approved_videos or skip_post:
            if skip_post:
                console.print("[yellow]Skipping posting (--skip-post)[/yellow]")
            return approved_videos

        # Step 5: Post to platforms
        console.print("[bold]Step 5: Posting to platforms...[/bold]")
        for video in approved_videos:
            content = self.db.get_content_item(video.content_id)
            if content is None:
                continue

            # Post to Instagram
            try:
                self.instagram_agent.post(video, content)
                console.print(f"[green]Posted video #{video.id} to Instagram[/green]")
            except Exception as e:
                console.print(f"[red]Instagram post failed: {e}[/red]")
                logger.exception("Instagram post failed for video #%d", video.id)

            # Upload to YouTube
            try:
                self.youtube_agent.upload(video, content)
                console.print(f"[green]Uploaded video #{video.id} to YouTube[/green]")
            except Exception as e:
                console.print(f"[red]YouTube upload failed: {e}[/red]")
                logger.exception("YouTube upload failed for video #%d", video.id)

            # Mark completed if both succeeded
            self.db.update_content_status(video.content_id, ContentStatus.COMPLETED)

        console.print(f"\n[bold green]Pipeline complete! {len(approved_videos)} videos processed.[/bold green]")
        return approved_videos

    def review_pending(self) -> None:
        """Review items awaiting approval."""
        drafts = self.db.get_items_by_status(ContentStatus.SCRIPT_DRAFT)
        if not drafts:
            console.print("[dim]No scripts pending review.[/dim]")
            return

        approved = approval_gate(drafts, "script", "human", self.db)
        for item in approved:
            self.db.update_content_status(
                item.id,
                ContentStatus.SCRIPT_APPROVED,
                approved_by="human",
            )
