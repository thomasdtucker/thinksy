from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from .config import Config
from .db import Database
from .models import ContentStatus, SoftwareCategory
from .orchestrator.agent import OrchestratorAgent

app = typer.Typer(
    name="thinksy",
    help="Thinksy — AI Marketing Pipeline for Software Advice video ads",
)
console = Console()


def _get_config() -> Config:
    return Config()


def _get_db(config: Config) -> Database:
    config.ensure_dirs()
    return Database(config.db_path)


@app.command()
def generate(
    instruction: str = typer.Argument(
        help="What kind of content to create (e.g., 'HR software for small businesses')"
    ),
    count: int = typer.Option(3, "--count", "-n", help="Number of scripts to generate"),
    category: Optional[str] = typer.Option(
        None,
        "--category",
        "-c",
        help="Force category: hr, accounting, project_management",
    ),
    auto: bool = typer.Option(False, "--auto", help="Skip approval gates"),
    skip_video: bool = typer.Option(False, "--skip-video", help="Generate scripts only"),
    skip_post: bool = typer.Option(False, "--skip-post", help="Generate scripts + videos but don't post"),
) -> None:
    """Generate content ideas, scripts, videos, and post to social media."""
    config = _get_config()
    if auto:
        config.approval_mode = "auto"

    cat = None
    if category:
        try:
            cat = SoftwareCategory(category)
        except ValueError:
            console.print(f"[red]Invalid category: {category}[/red]")
            console.print("Valid: hr, accounting, project_management")
            raise typer.Exit(1)

    db = _get_db(config)
    orchestrator = OrchestratorAgent(config, db)

    try:
        orchestrator.run_pipeline(
            instruction=instruction,
            count=count,
            category=cat,
            skip_video=skip_video,
            skip_post=skip_post,
        )
    finally:
        db.close()


@app.command()
def review() -> None:
    """Review pending scripts awaiting approval."""
    config = _get_config()
    db = _get_db(config)
    orchestrator = OrchestratorAgent(config, db)

    try:
        orchestrator.review_pending()
    finally:
        db.close()


@app.command()
def status() -> None:
    """Show pipeline status — items in each stage."""
    config = _get_config()
    db = _get_db(config)

    try:
        counts = db.get_status_counts()

        if not counts:
            console.print("[dim]No content in pipeline yet. Run 'thinksy generate' to start.[/dim]")
            return

        table = Table(title="Pipeline Status")
        table.add_column("Stage", style="bold")
        table.add_column("Count", justify="right")

        for stage in ContentStatus:
            count = counts.get(stage.value, 0)
            if count > 0:
                style = "green" if stage == ContentStatus.COMPLETED else "yellow"
                table.add_row(stage.value, str(count), style=style)

        console.print(table)
        console.print(f"\n[dim]Total: {sum(counts.values())} items[/dim]")
    finally:
        db.close()


@app.command()
def ls(
    stage: Optional[str] = typer.Argument(None, help="Filter by status (e.g., script_draft)"),
) -> None:
    """List content items, optionally filtered by stage."""
    config = _get_config()
    db = _get_db(config)

    try:
        if stage:
            try:
                status_filter = ContentStatus(stage)
            except ValueError:
                console.print(f"[red]Invalid stage: {stage}[/red]")
                console.print(f"Valid: {', '.join(s.value for s in ContentStatus)}")
                raise typer.Exit(1)
            items = db.get_items_by_status(status_filter)
        else:
            # Show all non-idea items
            items = []
            for s in ContentStatus:
                items.extend(db.get_items_by_status(s))

        if not items:
            console.print("[dim]No items found.[/dim]")
            return

        table = Table(title="Content Items")
        table.add_column("ID", justify="right")
        table.add_column("Category")
        table.add_column("Status")
        table.add_column("Hook", max_width=60)

        for item in items:
            table.add_row(
                str(item.id),
                item.category.value,
                item.status.value,
                item.hook[:60],
            )

        console.print(table)
    finally:
        db.close()


@app.command()
def engage(
    hashtags: str = typer.Argument(help="Comma-separated hashtags to engage with"),
    max_comments: int = typer.Option(5, "--max", help="Maximum comments to post"),
) -> None:
    """Engage with Instagram posts by hashtag (follow, comment)."""
    from .instagram.engagement import EngagementAgent

    config = _get_config()
    agent = EngagementAgent(config)
    tag_list = [h.strip().lstrip("#") for h in hashtags.split(",")]

    count = agent.engage_with_hashtags(tag_list, max_comments)
    console.print(f"[green]Engagement complete: {count} comments posted[/green]")


@app.command()
def web() -> None:
    """Start the Next.js frontend dev server."""
    web_dir = Path(__file__).parent.parent / "web"
    if not (web_dir / "package.json").exists():
        console.print(f"[red]Next.js project not found at {web_dir}[/red]")
        console.print("Run 'npm install' in the web/ directory first.")
        raise typer.Exit(1)

    console.print(f"[bold]Starting Next.js dev server in {web_dir}...[/bold]")
    subprocess.run(["npm", "run", "dev"], cwd=str(web_dir))


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )


@app.callback()
def main(verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging")) -> None:
    setup_logging(verbose)


if __name__ == "__main__":
    app()
