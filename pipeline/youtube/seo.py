from __future__ import annotations

from ..models import ContentItem
from ..shared.llm import ClaudeClient

SEO_SYSTEM = """You are a YouTube SEO expert specializing in B2B software content.
You optimize YouTube Shorts metadata for maximum discoverability.

Key principles:
- Title: Under 60 chars, include primary keyword, create curiosity
- Description: 200-300 words, front-load keywords, include links and timestamps
- Tags: 15-20 tags mixing broad and specific keywords
- Always include www.softwareadvice.com link in description
- Target US small business audience
- Include geo-targeted terms (US, United States, small business)"""

SEO_PROMPT = """Generate YouTube Shorts SEO metadata for this video ad:

Category: {category}
Hook: {hook}
Script: {script}
CTA: {cta}

Return a JSON object with:
- "title": YouTube title (under 60 chars)
- "description": Full description with link to www.softwareadvice.com (200-300 words)
- "tags": Array of 15-20 tags as strings"""


def generate_youtube_metadata(
    llm: ClaudeClient,
    content: ContentItem,
) -> dict:
    result = llm.chat_json(
        system=SEO_SYSTEM,
        user=SEO_PROMPT.format(
            category=content.category.value,
            hook=content.hook,
            script=content.script,
            cta=content.cta,
        ),
    )
    # Ensure required fields
    assert isinstance(result, dict)
    assert "title" in result
    assert "description" in result
    assert "tags" in result
    return result
