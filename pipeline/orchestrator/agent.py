from __future__ import annotations

import logging
from typing import Optional

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from ..config import Config
from ..content_strategist.agent import ContentStrategistAgent
from ..db import Database
from ..frontend.agent import FrontendSEOAgent
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
        self.frontend_agent = FrontendSEOAgent(config, db)

    def _generate_videos_with_progress(self, scripts: list[ContentItem]) -> list[Video]:
        """Generate videos for a list of approved scripts, showing a live progress indicator."""
        videos: list[Video] = []
        total = len(scripts)

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            TimeElapsedColumn(),
            console=console,
            transient=False,
        ) as progress:
            for i, item in enumerate(scripts):
                task = progress.add_task(
                    f"[bold cyan][{i + 1}/{total}][/bold cyan] Rendering: {item.hook[:60]}",
                    total=None,
                )
                try:
                    video = self.video_agent.generate(item)
                    progress.remove_task(task)
                    console.print(f"[green]✓[/green] Video #{video.id}: {item.hook[:60]}")
                    videos.append(video)
                except RuntimeError as e:
                    progress.remove_task(task)
                    console.print(f"[red]✗[/red] Script #{item.id}: {e}")
                    logger.error("Video generation failed for content #%d: %s", item.id, e)

        return videos

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
        with console.status("[dim]Writing scripts with Claude...[/dim]", spinner="dots"):
            content_items = self.content_agent.generate(instruction, count, category)
        console.print(f"[green]✓ Generated {len(content_items)} scripts[/green]\n")

        # Step 2: Approval gate for scripts
        approved_scripts = approval_gate(
            content_items, "script", self.config.approval_mode, self.db
        )
        for item in approved_scripts:
            assert item.id is not None
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
        console.print(f"\n[bold]Step 3: Generating {len(approved_scripts)} video(s)...[/bold]")
        videos = self._generate_videos_with_progress(approved_scripts)

        if not videos:
            console.print("[red]No videos generated. Pipeline stopped.[/red]")
            return []

        # Step 4: Approval gate for videos
        approved_videos = approval_gate(
            videos, "video", self.config.approval_mode, self.db
        )
        for video in approved_videos:
            assert video.id is not None
            self.db.update_video(video.id, status=ContentStatus.VIDEO_APPROVED.value)
            self.db.update_content_status(video.content_id, ContentStatus.VIDEO_APPROVED)

        if not approved_videos or skip_post:
            if skip_post:
                console.print("[yellow]Skipping posting (--skip-post)[/yellow]")
            return approved_videos

        # Step 5: Post to platforms
        console.print("\n[bold]Step 5: Posting to platforms...[/bold]")
        for video in approved_videos:
            content = self.db.get_content_item(video.content_id)
            if content is None:
                continue
            ig_ok = True
            yt_ok = True
            with console.status(f"[dim]Posting video #{video.id} to Instagram...[/dim]", spinner="dots"):
                try:
                    self.instagram_agent.post(video, content)
                    console.print(f"[green]\u2713[/green] Video #{video.id} posted to Instagram")
                except Exception as e:
                    ig_ok = False
                    console.print(f"[red]\u2717[/red] Instagram post failed: {e}")
                    logger.exception("Instagram post failed for video #%d", video.id)
            with console.status(f"[dim]Uploading video #{video.id} to YouTube...[/dim]", spinner="dots"):
                try:
                    self.youtube_agent.upload(video, content)
                    console.print(f"[green]\u2713[/green] Video #{video.id} uploaded to YouTube")
                except Exception as e:
                    yt_ok = False
                    console.print(f"[red]\u2717[/red] YouTube upload failed: {e}")
                    logger.exception("YouTube upload failed for video #%d", video.id)
            if ig_ok and yt_ok:
                self.db.update_content_status(video.content_id, ContentStatus.COMPLETED)
            elif ig_ok:
                self.db.update_content_status(video.content_id, ContentStatus.POSTED_INSTAGRAM)
            elif yt_ok:
                self.db.update_content_status(video.content_id, ContentStatus.POSTED_YOUTUBE)

        # Step 6: Frontend SEO
        console.print("\n[bold]Step 6: Updating website & SEO...[/bold]")
        with console.status("[dim]Rebuilding site and generating SEO metadata...[/dim]", spinner="dots"):
            try:
                self.frontend_agent.run_full_update(approved_videos)
                console.print("[green]✓[/green] Site updated")
            except Exception as e:
                console.print(f"[red]✗[/red] Frontend update failed: {e}")
                logger.exception("Frontend SEO update failed")

        console.print(f"\n[bold green]Pipeline complete! {len(approved_videos)} video(s) processed.[/bold green]")
        return approved_videos

    def produce_videos(
        self,
        skip_post: bool = False,
        limit: Optional[int] = None,
        review: bool = True,
    ) -> list[Video]:
        """Generate videos for script_approved items already in the database."""
        approved_scripts = self.db.get_items_by_status(ContentStatus.SCRIPT_APPROVED)
        if limit is not None:
            approved_scripts = approved_scripts[:limit]

        if not approved_scripts:
            console.print("[dim]No approved scripts found. Run 'thinksy generate' or 'thinksy review' first.[/dim]")
            return []

        console.print(f"\n[bold]Generating {len(approved_scripts)} video(s)...[/bold]")
        videos = self._generate_videos_with_progress(approved_scripts)

        if not videos:
            console.print("[red]No videos generated.[/red]")
            return []

        if not review:
            if skip_post:
                console.print("[yellow]Skipping posting (--skip-post)[/yellow]")
            return videos

        approved_videos = approval_gate(videos, "video", self.config.approval_mode, self.db)
        for video in approved_videos:
            assert video.id is not None
            self.db.update_video(video.id, status=ContentStatus.VIDEO_APPROVED.value)
            self.db.update_content_status(video.content_id, ContentStatus.VIDEO_APPROVED)

        if not approved_videos or skip_post:
            if skip_post:
                console.print("[yellow]Skipping posting (--skip-post)[/yellow]")
            return approved_videos

        console.print("\n[bold]Posting to platforms...[/bold]")
        for video in approved_videos:
            content = self.db.get_content_item(video.content_id)
            if content is None:
                continue
            ig_ok = True
            yt_ok = True
            with console.status(f"[dim]Posting video #{video.id} to Instagram...[/dim]", spinner="dots"):
                try:
                    self.instagram_agent.post(video, content)
                    console.print(f"[green]\u2713[/green] Video #{video.id} posted to Instagram")
                except Exception as e:
                    ig_ok = False
                    console.print(f"[red]\u2717[/red] Instagram post failed: {e}")
                    logger.exception("Instagram post failed for video #%d", video.id)
            with console.status(f"[dim]Uploading video #{video.id} to YouTube...[/dim]", spinner="dots"):
                try:
                    self.youtube_agent.upload(video, content)
                    console.print(f"[green]\u2713[/green] Video #{video.id} uploaded to YouTube")
                except Exception as e:
                    yt_ok = False
                    console.print(f"[red]\u2717[/red] YouTube upload failed: {e}")
                    logger.exception("YouTube upload failed for video #%d", video.id)
            if ig_ok and yt_ok:
                self.db.update_content_status(video.content_id, ContentStatus.COMPLETED)
            elif ig_ok:
                self.db.update_content_status(video.content_id, ContentStatus.POSTED_INSTAGRAM)
            elif yt_ok:
                self.db.update_content_status(video.content_id, ContentStatus.POSTED_YOUTUBE)

        with console.status("[dim]Rebuilding site and generating SEO metadata...[/dim]", spinner="dots"):
            try:
                self.frontend_agent.run_full_update(approved_videos)
                console.print("[green]✓[/green] Site updated")
            except Exception as e:
                console.print(f"[red]✗[/red] Frontend update failed: {e}")
                logger.exception("Frontend SEO update failed")

        console.print(f"\n[bold green]Done! {len(approved_videos)} video(s) processed.[/bold green]")
        return approved_videos

    def post_approved_videos(
        self,
        platform: str = "both",
        limit: Optional[int] = None,
    ) -> int:
        if platform not in ("both", "instagram", "youtube"):
            raise ValueError("platform must be 'both', 'instagram', or 'youtube'")

        do_ig = platform in ("both", "instagram")
        do_yt = platform in ("both", "youtube")

        # Find videos that still need posting (including ones previously marked
        # completed despite failed posts)
        videos = self.db.get_unposted_videos(platform=platform)
        if limit is not None:
            videos = videos[:limit]
        if not videos:
            console.print("[dim]No unposted videos found.[/dim]")
            return 0

        posted = 0
        console.print(f"\n[bold]Posting {len(videos)} video(s) ({platform})...[/bold]")
        for video in videos:
            content = self.db.get_content_item(video.content_id)
            if content is None:
                continue

            ig_ok = True
            yt_ok = True

            if do_ig:
                with console.status(
                    f"[dim]Posting video #{video.id} to Instagram...[/dim]",
                    spinner="dots",
                ):
                    try:
                        self.instagram_agent.post(video, content)
                        console.print(f"[green]\u2713[/green] Video #{video.id} posted to Instagram")
                    except Exception as e:
                        ig_ok = False
                        console.print(f"[red]\u2717[/red] Instagram post failed for video #{video.id}: {e}")
                        logger.exception("Instagram post failed for video #%d", video.id)

            if do_yt:
                with console.status(
                    f"[dim]Uploading video #{video.id} to YouTube...[/dim]",
                    spinner="dots",
                ):
                    try:
                        self.youtube_agent.upload(video, content)
                        console.print(f"[green]\u2713[/green] Video #{video.id} uploaded to YouTube")
                    except Exception as e:
                        yt_ok = False
                        console.print(f"[red]\u2717[/red] YouTube upload failed for video #{video.id}: {e}")
                        logger.exception("YouTube upload failed for video #%d", video.id)

            if ig_ok and yt_ok:
                self.db.update_content_status(video.content_id, ContentStatus.COMPLETED)
                posted += 1
            elif ig_ok and not yt_ok:
                self.db.update_content_status(video.content_id, ContentStatus.POSTED_INSTAGRAM)
            elif yt_ok and not ig_ok:
                self.db.update_content_status(video.content_id, ContentStatus.POSTED_YOUTUBE)

        console.print(f"\n[bold green]Posted {posted} video(s) fully.[/bold green]")
        return posted

    def review_pending(self) -> None:
        """Review items awaiting approval."""
        drafts = self.db.get_items_by_status(ContentStatus.SCRIPT_DRAFT)
        if not drafts:
            console.print("[dim]No scripts pending review.[/dim]")
            return

        approved = approval_gate(drafts, "script", "human", self.db)
        for item in approved:
            assert item.id is not None
            self.db.update_content_status(
                item.id,
                ContentStatus.SCRIPT_APPROVED,
                approved_by="human",
            )
