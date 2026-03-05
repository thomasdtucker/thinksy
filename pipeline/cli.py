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
    except RuntimeError as e:
        console.print(f"\n[red]Error:[/red] {e}")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def produce(
    skip_post: bool = typer.Option(False, "--skip-post", help="Generate videos but don't post"),
    auto: bool = typer.Option(False, "--auto", help="Skip approval gate"),
    limit: Optional[int] = typer.Option(None, "--limit", "-n", help="Max number of videos to produce"),
) -> None:
    """Generate videos for already-approved scripts."""
    config = _get_config()
    if auto:
        config.approval_mode = "auto"
    db = _get_db(config)
    orchestrator = OrchestratorAgent(config, db)

    try:
        orchestrator.produce_videos(skip_post=skip_post, limit=limit)
    except RuntimeError as e:
        console.print(f"\n[red]Error:[/red] {e}")
        raise typer.Exit(1)
    finally:
        db.close()


@app.command()
def reset(
    from_status: str = typer.Argument(help="Status to reset from (e.g. video_generating)"),
    to_status: str = typer.Argument(help="Status to reset to (e.g. script_approved)"),
) -> None:
    """Reset content items from one status to another.

    Useful for unsticking items after a failed pipeline step.

    Example: thinksy reset video_generating script_approved
    """
    try:
        from_s = ContentStatus(from_status)
        to_s = ContentStatus(to_status)
    except ValueError as e:
        console.print(f"[red]Invalid status:[/red] {e}")
        console.print(f"Valid statuses: {', '.join(s.value for s in ContentStatus)}")
        raise typer.Exit(1)

    config = _get_config()
    db = _get_db(config)

    try:
        items = db.get_items_by_status(from_s)
        if not items:
            console.print(f"[dim]No items with status '{from_status}'.[/dim]")
            return
        for item in items:
            db.update_content_status(item.id, to_s)
        console.print(f"[green]Reset {len(items)} item(s) from '{from_status}' \u2192 '{to_status}'[/green]")
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
    """Show pipeline status \u2014 items in each stage."""
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
def geo(
    category: Optional[str] = typer.Option(
        None, "--category", "-c", help="Category: hr, accounting, project_management"
    ),
    cities: int = typer.Option(20, "--cities", help="Number of top cities to target"),
) -> None:
    """Generate geo-targeted landing pages for SEO."""
    from .frontend.agent import FrontendSEOAgent
    from .frontend.seo import TARGET_CITIES

    config = _get_config()
    db = _get_db(config)

    try:
        agent = FrontendSEOAgent(config, db)
        cats = [category] if category else None
        target = TARGET_CITIES[:cities]
        agent.generate_geo_pages(categories=cats, cities=target)
    finally:
        db.close()


@app.command()
def seo_update() -> None:
    """Generate SEO metadata for all videos missing it, rebuild site, submit to Google."""
    from .frontend.agent import FrontendSEOAgent

    config = _get_config()
    db = _get_db(config)

    try:
        agent = FrontendSEOAgent(config, db)
        # Find videos without SEO metadata
        posted = db.get_all_posted_videos()
        videos_needing_seo = []
        for v in posted:
            if db.get_seo_metadata(v["id"]) is None:
                video = db.get_video(v["id"])
                if video:
                    videos_needing_seo.append(video)

        if videos_needing_seo:
            console.print(f"[bold]Generating SEO for {len(videos_needing_seo)} videos...[/bold]")
            agent.process_new_videos(videos_needing_seo)
        else:
            console.print("[dim]All videos have SEO metadata.[/dim]")

        agent.rebuild_site()
        agent.submit_urls_to_google()
    finally:
        db.close()


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


# --- Memory Store Commands ---

MEMORY_DB = str(Path(__file__).parent.parent / "context" / "memory.db")


def _get_memory():
    from .memory.store import MemoryStore
    return MemoryStore(MEMORY_DB)


@app.command()
def remember(
    title: str = typer.Argument(help="Title of the knowledge node"),
    content: str = typer.Argument(help="Content body"),
    type: str = typer.Option(
        "concept", "--type", "-t",
        help="Node type: strategy, plan, research, doc, concept, decision, insight",
    ),
    tags: Optional[str] = typer.Option(None, "--tags", help="Comma-separated tags"),
) -> None:
    """Store a piece of knowledge in the memory graph."""
    from .memory.models import Node, NodeType

    try:
        node_type = NodeType(type)
    except ValueError:
        console.print(f"[red]Invalid type: {type}[/red]")
        console.print(f"Valid: {', '.join(t.value for t in NodeType)}")
        raise typer.Exit(1)

    tag_list = [t.strip() for t in tags.split(",")] if tags else []
    node = Node(type=node_type, title=title, content=content, tags=tag_list)

    mem = _get_memory()
    try:
        node_id = mem.add_node(node)
        console.print(f"[green]Remembered #{node_id}:[/green] {title}")
        if tag_list:
            console.print(f"[dim]Tags: {', '.join(tag_list)}[/dim]")
    finally:
        mem.close()


@app.command()
def recall(
    query: Optional[str] = typer.Argument(None, help="Search query (full-text search)"),
    type: Optional[str] = typer.Option(None, "--type", "-t", help="Filter by node type"),
    tag: Optional[str] = typer.Option(None, "--tag", help="Filter by tag"),
    node_id: Optional[int] = typer.Option(None, "--id", help="Get specific node by ID"),
) -> None:
    """Search and retrieve knowledge from the memory graph."""
    from .memory.models import NodeType

    mem = _get_memory()
    try:
        if node_id:
            node = mem.get_node(node_id)
            if not node:
                console.print(f"[red]Node #{node_id} not found.[/red]")
                raise typer.Exit(1)
            _print_node_detail(mem, node)
            return

        if query:
            nodes = mem.search_nodes(query)
        elif type:
            try:
                node_type = NodeType(type)
            except ValueError:
                console.print(f"[red]Invalid type: {type}[/red]")
                raise typer.Exit(1)
            nodes = mem.get_nodes_by_type(node_type)
        elif tag:
            nodes = mem.get_nodes_by_tag(tag)
        else:
            nodes = mem.get_all_nodes()

        if not nodes:
            console.print("[dim]No memories found.[/dim]")
            return

        table = Table(title="Memory")
        table.add_column("ID", justify="right", style="bold")
        table.add_column("Type")
        table.add_column("Title", max_width=50)
        table.add_column("Tags")
        table.add_column("Updated")

        for n in nodes:
            table.add_row(
                str(n.id),
                n.type.value,
                n.title[:50],
                ", ".join(n.tags) if n.tags else "",
                str(n.updated_at)[:10] if n.updated_at else "",
            )

        console.print(table)
        console.print(f"\n[dim]{len(nodes)} result(s)[/dim]")
    finally:
        mem.close()


@app.command()
def connect(
    source: int = typer.Argument(help="Source node ID"),
    target: int = typer.Argument(help="Target node ID"),
    relationship: str = typer.Option(
        "relates_to", "--rel", "-r",
        help="Relationship: relates_to, part_of, references, depends_on, supersedes, supports, contradicts",
    ),
    label: str = typer.Option("", "--label", "-l", help="Optional edge label"),
) -> None:
    """Create a relationship between two knowledge nodes."""
    from .memory.models import Edge, EdgeType

    try:
        rel = EdgeType(relationship)
    except ValueError:
        console.print(f"[red]Invalid relationship: {relationship}[/red]")
        console.print(f"Valid: {', '.join(r.value for r in EdgeType)}")
        raise typer.Exit(1)

    mem = _get_memory()
    try:
        src = mem.get_node(source)
        tgt = mem.get_node(target)
        if not src:
            console.print(f"[red]Source node #{source} not found.[/red]")
            raise typer.Exit(1)
        if not tgt:
            console.print(f"[red]Target node #{target} not found.[/red]")
            raise typer.Exit(1)

        edge = Edge(source_id=source, target_id=target, relationship=rel, label=label)
        mem.add_edge(edge)
        console.print(
            f"[green]Connected:[/green] #{source} ({src.title}) "
            f"\u2014[{rel.value}]\u2192 #{target} ({tgt.title})"
        )
    finally:
        mem.close()


@app.command()
def forget(
    node_id: int = typer.Argument(help="Node ID to delete"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
) -> None:
    """Delete a knowledge node and its connections."""
    mem = _get_memory()
    try:
        node = mem.get_node(node_id)
        if not node:
            console.print(f"[red]Node #{node_id} not found.[/red]")
            raise typer.Exit(1)

        if not force:
            console.print(f"Delete #{node_id}: [bold]{node.title}[/bold] ({node.type.value})?")
            confirm = typer.confirm("Are you sure?")
            if not confirm:
                raise typer.Abort()

        mem.delete_node(node_id)
        console.print(f"[green]Deleted #{node_id}: {node.title}[/green]")
    finally:
        mem.close()


@app.command(name="memory-stats")
def memory_stats() -> None:
    """Show memory graph statistics."""
    mem = _get_memory()
    try:
        stats = mem.get_stats()

        if stats["total_nodes"] == 0:
            console.print("[dim]Memory is empty. Use 'thinksy remember' to add knowledge.[/dim]")
            return

        console.print("\n[bold]Memory Graph[/bold]")
        console.print(f"  Nodes: {stats['total_nodes']}")
        console.print(f"  Edges: {stats['total_edges']}")

        if stats["nodes_by_type"]:
            console.print("\n[bold]By Type:[/bold]")
            for t, c in sorted(stats["nodes_by_type"].items()):
                console.print(f"  {t}: {c}")

        if stats["edges_by_type"]:
            console.print("\n[bold]Relationships:[/bold]")
            for r, c in sorted(stats["edges_by_type"].items()):
                console.print(f"  {r}: {c}")
    finally:
        mem.close()


def _print_node_detail(mem, node) -> None:
    console.print(f"\n[bold]#{node.id} \u2014 {node.title}[/bold]")
    console.print(f"Type: {node.type.value}")
    if node.tags:
        console.print(f"Tags: {', '.join(node.tags)}")
    console.print(f"Created: {str(node.created_at)[:19]}")
    console.print(f"Updated: {str(node.updated_at)[:19]}")

    if node.content:
        console.print(f"\n{node.content}")

    outgoing = mem.get_edges_from(node.id)
    incoming = mem.get_edges_to(node.id)

    if outgoing:
        console.print("\n[bold]Connections \u2192[/bold]")
        for e in outgoing:
            lbl = f' "{e["label"]}"' if e.get("label") else ""
            console.print(
                f"  \u2014[{e['relationship']}]{lbl}\u2192 #{e['target_id']} {e['target_title']}"
            )

    if incoming:
        console.print("\n[bold]\u2190 Connections[/bold]")
        for e in incoming:
            lbl = f' "{e["label"]}"' if e.get("label") else ""
            console.print(
                f"  \u2190[{e['relationship']}]{lbl}\u2014 #{e['source_id']} {e['source_title']}"
            )


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
