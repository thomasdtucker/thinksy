from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path
from typing import Optional

import requests
from rich.console import Console

from ..config import Config
from ..db import Database
from ..models import ContentItem, SoftwareCategory, Video
from ..shared.llm import ClaudeClient
from .seo import TARGET_CITIES, generate_geo_page, generate_page_seo

console = Console()
logger = logging.getLogger(__name__)

CATEGORY_DISPLAY = {
    "hr": "HR Software",
    "accounting": "Accounting Software",
    "project_management": "Project Management Software",
}


class FrontendSEOAgent:
    def __init__(self, config: Config, db: Database) -> None:
        self.config = config
        self.db = db
        self.llm = ClaudeClient(config.anthropic_api_key)
        self.web_dir = Path(__file__).parent.parent.parent / "web"

    def process_new_videos(self, videos: list[Video]) -> None:
        """Generate SEO metadata for newly posted videos and update the site."""
        for video in videos:
            content = self.db.get_content_item(video.content_id)
            if content is None:
                continue

            # Generate SEO metadata and store in DB
            logger.info("Generating SEO metadata for video #%d", video.id)
            seo_data = generate_page_seo(self.llm, content, video)
            self.db.upsert_seo_metadata(video.id, seo_data)
            self.db.log_action(
                content.id,
                "FrontendSEOAgent",
                "generated_seo_metadata",
                seo_data,
            )
            console.print(
                f"[green]SEO metadata generated for video #{video.id}[/green]"
            )

    def generate_geo_pages(
        self,
        categories: Optional[list[str]] = None,
        cities: Optional[list[tuple[str, str]]] = None,
    ) -> int:
        """Generate geo-targeted landing pages for category + city combos."""
        cats = categories or [c.value for c in SoftwareCategory]
        target_cities = cities or TARGET_CITIES

        count = 0
        for category in cats:
            for city, state in target_cities:
                # Skip if already generated
                slug = self._make_slug(category, city, state)
                existing = self.db.get_geo_page(slug)
                if existing:
                    logger.debug("Geo page already exists: %s", slug)
                    continue

                logger.info("Generating geo page: %s", slug)
                try:
                    page_data = generate_geo_page(
                        self.llm, CATEGORY_DISPLAY.get(category, category), city, state
                    )
                    page_data["slug"] = slug
                    page_data["category"] = category
                    page_data["city"] = city
                    page_data["state"] = state
                    self.db.insert_geo_page(page_data)
                    self.db.log_action(
                        0,
                        "FrontendSEOAgent",
                        "generated_geo_page",
                        {"slug": slug},
                    )
                    count += 1
                    console.print(f"[green]Generated geo page: {slug}[/green]")
                except Exception as e:
                    logger.error("Failed to generate geo page %s: %s", slug, e)

        console.print(
            f"\n[bold green]Generated {count} geo-targeted pages[/bold green]"
        )
        return count

    def rebuild_site(self) -> bool:
        """Trigger a Next.js rebuild."""
        if not (self.web_dir / "package.json").exists():
            console.print("[red]Next.js project not found[/red]")
            return False

        console.print("[bold]Rebuilding Next.js site...[/bold]")
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(self.web_dir),
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            console.print("[green]Site rebuilt successfully[/green]")
            return True
        else:
            console.print(f"[red]Build failed: {result.stderr[-500:]}[/red]")
            logger.error("Next.js build failed: %s", result.stderr)
            return False

    def submit_urls_to_google(self, urls: Optional[list[str]] = None) -> int:
        """Submit URLs to Google Indexing API for faster indexing."""
        if not self.config.google_indexing_key_path:
            console.print(
                "[yellow]Google Indexing API not configured "
                "(set GOOGLE_INDEXING_KEY_PATH in .env)[/yellow]"
            )
            return 0

        if urls is None:
            urls = self._collect_all_urls()

        submitted = 0
        for url in urls:
            try:
                success = self._submit_url(url)
                if success:
                    submitted += 1
                    logger.info("Submitted to Google: %s", url)
            except Exception as e:
                logger.error("Failed to submit %s: %s", url, e)

        console.print(
            f"[green]Submitted {submitted}/{len(urls)} URLs to Google[/green]"
        )
        return submitted

    def run_full_update(self, videos: list[Video]) -> None:
        """Full frontend update: SEO metadata → geo pages → rebuild → submit to Google."""
        console.print("\n[bold blue]Frontend SEO Agent[/bold blue]")

        # Step 1: Generate SEO metadata for new videos
        if videos:
            console.print("[bold]Step 1: Generating SEO metadata...[/bold]")
            self.process_new_videos(videos)

        # Step 2: Rebuild the site
        console.print("[bold]Step 2: Rebuilding site...[/bold]")
        self.rebuild_site()

        # Step 3: Submit new URLs to Google
        console.print("[bold]Step 3: Submitting URLs to Google...[/bold]")
        new_urls = [
            f"{self.config.public_video_host}/videos/{v.id}" for v in videos
        ]
        self.submit_urls_to_google(new_urls)

        console.print("[bold green]Frontend update complete![/bold green]")

    def _collect_all_urls(self) -> list[str]:
        """Collect all site URLs that should be indexed."""
        base = self.config.public_video_host
        urls = [base]

        # Video pages
        posted = self.db.get_all_posted_videos()
        for v in posted:
            urls.append(f"{base}/videos/{v['id']}")

        # Geo pages
        geo_pages = self.db.get_all_geo_pages()
        for page in geo_pages:
            urls.append(f"{base}/{page['slug']}")

        return urls

    def _submit_url(self, url: str) -> bool:
        """Submit a single URL to Google Indexing API."""
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials = service_account.Credentials.from_service_account_file(
            self.config.google_indexing_key_path,
            scopes=["https://www.googleapis.com/auth/indexing"],
        )
        service = build("indexing", "v3", credentials=credentials)
        body = {"url": url, "type": "URL_UPDATED"}
        service.urlNotifications().publish(body=body).execute()
        return True

    @staticmethod
    def _make_slug(category: str, city: str, state: str) -> str:
        city_slug = city.lower().replace(" ", "-")
        state_slug = state.lower()
        cat_slug = category.replace("_", "-")
        return f"{cat_slug}-software-{city_slug}-{state_slug}"
