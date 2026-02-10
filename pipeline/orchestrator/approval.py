from __future__ import annotations

import logging
from typing import Union

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table

from ..models import ContentItem, Video

console = Console()
logger = logging.getLogger(__name__)


def display_content_for_review(item: ContentItem) -> None:
    table = Table(title=f"Script #{item.id} — {item.category.value.upper()}")
    table.add_column("Field", style="bold cyan")
    table.add_column("Value")
    table.add_row("Hook", item.hook)
    table.add_row("Script", item.script)
    table.add_row("CTA", item.cta)
    table.add_row("Visual Direction", item.visual_direction)
    table.add_row("Target URL", item.target_url)
    console.print(table)


def display_video_for_review(video: Video, content: ContentItem) -> None:
    console.print(
        Panel(
            f"[bold]Video #{video.id}[/bold] for Script #{content.id}\n\n"
            f"File: {video.video_path}\n"
            f"Duration: {video.duration_seconds}s\n\n"
            f"[dim]Open the file to preview before approving.[/dim]",
            title=f"Video Review — {content.category.value.upper()}",
        )
    )


def prompt_approval(item_id: int, stage: str) -> str:
    """Prompt user for approval. Returns 'y', 'n', or 'edit'."""
    return Prompt.ask(
        f"Approve {stage} #{item_id}?",
        choices=["y", "n", "edit"],
        default="y",
    )


def approval_gate(
    items: list[Union[ContentItem, Video]],
    stage: str,
    mode: str,
    db: object,
) -> list[Union[ContentItem, Video]]:
    """Run approval gate. Returns approved items."""
    if mode == "auto":
        logger.info("Auto-approving %d %s items", len(items), stage)
        return items

    console.print(f"\n[bold yellow]Review {len(items)} {stage}(s):[/bold yellow]\n")
    approved = []

    for item in items:
        if stage == "script" and isinstance(item, ContentItem):
            display_content_for_review(item)
        elif stage == "video" and isinstance(item, Video):
            display_video_for_review(item, item)  # type: ignore

        response = prompt_approval(item.id, stage)  # type: ignore
        if response == "y":
            approved.append(item)
            console.print(f"[green]✓ {stage.capitalize()} #{item.id} approved[/green]")
        elif response == "n":
            console.print(f"[red]✗ {stage.capitalize()} #{item.id} rejected[/red]")
        elif response == "edit":
            console.print("[yellow]Edit mode not yet implemented — skipping[/yellow]")

    console.print(f"\n[bold]{len(approved)}/{len(items)} {stage}(s) approved[/bold]\n")
    return approved
