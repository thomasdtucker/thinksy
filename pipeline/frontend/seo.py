from __future__ import annotations

from ..models import ContentItem, Video
from ..shared.llm import ClaudeClient

SEO_METADATA_SYSTEM = """You are a Google SEO and frontend optimization expert specializing in video content pages.
You generate page-level SEO metadata optimized for Google indexing, local search, and social sharing.

Core SEO principles:
- Title tags: 50-60 chars, include primary keyword + location if geo-targeted
- Meta description: 150-160 chars, include CTA and primary keyword, written to maximize CTR
- Focus keywords: 3-5 primary keywords mixing broad and long-tail terms
- Generate geo-targeted variants for major US metros when applicable
- Optimize for "near me" and location-based software searches

Open Graph & social optimization (from v0 best practices):
- OG title should be compelling and slightly different from the page title — optimized for social sharing, not just search
- OG description should create curiosity and urgency (150 chars max)
- Include a clear value proposition in both OG fields

Structured data guidance:
- Recommend schema.org VideoObject markup with name, description, thumbnailUrl, uploadDate, duration, contentUrl
- Include publisher Organization markup
- For software-related pages, suggest SoftwareApplication schema where relevant

Accessibility-aware metadata:
- Alt text suggestions for the video thumbnail (descriptive, not decorative)
- Screen-reader-friendly title that makes sense when read aloud
- Ensure meta description works as a standalone summary for assistive tech"""

SEO_METADATA_PROMPT = """Generate SEO page metadata for this video ad page:

Category: {category}
Hook: {hook}
Script: {script}
CTA: {cta}
Video ID: {video_id}

Return a JSON object with:
- "page_title": SEO-optimized page title (50-60 chars, include primary keyword)
- "meta_description": Meta description (150-160 chars, CTR-optimized with CTA)
- "focus_keywords": Array of 3-5 keywords (mix broad + long-tail, e.g. ["hr software", "best hr tools for small business", "hr software comparison"])
- "og_title": Social-sharing-optimized title (compelling, curiosity-driven)
- "og_description": Social description (150 chars max, value proposition + urgency)
- "thumbnail_alt": Descriptive alt text for the video thumbnail
- "canonical_slug": Clean URL slug for this video (kebab-case, e.g. "hr-software-streamline-onboarding")"""

GEO_PAGE_SYSTEM = """You are a local SEO, GEO (Generative Engine Optimization), and frontend content expert.
You create geo-targeted landing page content for business software categories.

Content architecture (informed by v0 frontend patterns):
- Target a specific US city/metro + software category combination
- Structure content for both humans and search engines
- Use semantic HTML hierarchy: one H1, multiple H2s for benefits, clear section flow
- Write body text with line-height 1.4-1.6 readability in mind (short paragraphs, scannable)

SEO content rules:
- Mention the city/region naturally 3-5 times — never keyword-stuff
- Include locally relevant pain points, industry context, and statistics
- Front-load primary keyword in H1 and meta title
- Meta description must include city name, category, and a CTA
- Write text using `text-balance` / `text-pretty` friendly lengths (avoid very long or very short lines)

Design-aware content generation:
- Benefits should work as card layouts (title + 1-2 sentence description)
- Intro paragraph should be 2-3 sentences max (mobile-first — long intros lose users)
- CTA text should be action-oriented and specific (not generic "Learn More")
- Local stat should be concrete and verifiable (cite the source if possible)

Accessibility:
- H1 should make sense when read by a screen reader without visual context
- Benefit titles should be descriptive enough to stand alone
- Avoid jargon in H1 and meta description — write for a small business owner, not a developer

Schema.org structured data considerations:
- Page should support WebPage schema with areaServed (City + State + Country)
- Include SoftwareApplication applicationCategory
- Local business relevance signals"""

GEO_PAGE_PROMPT = """Create geo-targeted landing page content for:

Category: {category}
City: {city}
State: {state}

Return a JSON object with:
- "slug": URL slug in kebab-case (e.g., "hr-software-austin-tx")
- "h1": Page heading — include city name, front-load primary keyword, screen-reader friendly (max 70 chars)
- "meta_title": SEO title tag (50-60 chars, include city + category keyword)
- "meta_description": Meta description (150-160 chars, include city, category, and CTA)
- "intro": Intro paragraph (2-3 sentences, scannable, mobile-first — no walls of text)
- "benefits": Array of 3-4 benefit objects, each with:
  - "title": Short benefit headline (works as a card title, 5-8 words)
  - "description": 1-2 sentence explanation (works in a card layout)
- "cta_text": Specific action-oriented CTA button text (not generic — e.g., "Find HR Software in Austin")
- "local_stat": A concrete local business statistic with source (e.g., "Austin has 45,000+ small businesses according to the SBA")
- "focus_keywords": Array of 3-5 geo-targeted keywords (e.g., ["hr software austin", "austin hr tools", "best hr software texas"])
- "internal_links_suggested": Array of 2-3 related page slugs this page should link to (e.g., ["accounting-software-austin-tx", "project-management-software-austin-tx"])"""

# Top 20 US metros for geo-targeting
TARGET_CITIES = [
    ("New York", "NY"),
    ("Los Angeles", "CA"),
    ("Chicago", "IL"),
    ("Houston", "TX"),
    ("Phoenix", "AZ"),
    ("Philadelphia", "PA"),
    ("San Antonio", "TX"),
    ("San Diego", "CA"),
    ("Dallas", "TX"),
    ("Austin", "TX"),
    ("San Francisco", "CA"),
    ("Seattle", "WA"),
    ("Denver", "CO"),
    ("Boston", "MA"),
    ("Atlanta", "GA"),
    ("Miami", "FL"),
    ("Minneapolis", "MN"),
    ("Portland", "OR"),
    ("Charlotte", "NC"),
    ("Nashville", "TN"),
]


def generate_page_seo(
    llm: ClaudeClient, content: ContentItem, video: Video
) -> dict:
    result = llm.chat_json(
        system=SEO_METADATA_SYSTEM,
        user=SEO_METADATA_PROMPT.format(
            category=content.category.value,
            hook=content.hook,
            script=content.script,
            cta=content.cta,
            video_id=video.id,
        ),
    )
    assert isinstance(result, dict)
    return result


def generate_geo_page(
    llm: ClaudeClient, category: str, city: str, state: str
) -> dict:
    result = llm.chat_json(
        system=GEO_PAGE_SYSTEM,
        user=GEO_PAGE_PROMPT.format(
            category=category, city=city, state=state
        ),
    )
    assert isinstance(result, dict)
    return result
