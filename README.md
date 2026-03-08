# Thinksy

An AI-powered pipeline that turns a one-line prompt into published video ads. It writes scripts with Claude, records avatar videos with HeyGen, posts to Instagram Reels and YouTube Shorts, and keeps a Next.js site up to date with SEO-optimised video pages and geo-targeted landing pages.

---

## How it works

```
thinksy generate "HR software for small businesses"
```

That single command kicks off six stages:

```
1. Content Strategist  →  Claude writes N ad scripts (hook, narration, CTA)
2. Approval Gate       →  You review scripts (or pass --auto to skip)
3. Video Producer      →  HeyGen renders an avatar video for each script
4. Approval Gate       →  You review videos (or pass --auto to skip)
5. Social Posting      →  Instagram Reels + YouTube Shorts posted in parallel
6. Frontend / SEO      →  Next.js site rebuilt with new video pages + geo pages
```

All state lives in a single SQLite database (`data/thinksy.db`). The Next.js frontend reads that same database directly, so the site stays in sync with the pipeline without any API layer.

---

## Project structure

```
thinksy/
├── pipeline/                   # Python backend
│   ├── cli.py                  # CLI entry point (Typer)
│   ├── config.py               # Env-var config (Pydantic)
│   ├── models.py               # Shared data models
│   ├── db.py                   # Database class + schema
│   ├── orchestrator/           # Pipeline coordinator
│   ├── content_strategist/     # Script generation (Claude)
│   ├── video_producer/         # Video + avatar image gen (HeyGen)
│   ├── instagram/              # Reels posting + engagement
│   ├── youtube/                # Shorts upload + SEO
│   ├── frontend/               # Next.js rebuild + geo pages
│   └── shared/                 # LLM client, retry, storage utils
├── web/                        # Next.js 15 frontend
│   └── src/
│       ├── app/                # Pages (home, /videos/[slug], /[geo])
│       ├── components/         # VideoGrid, VideoCard
│       └── lib/                # DB queries, TypeScript types
├── data/                       # SQLite DB + downloaded media
│   ├── thinksy.db
│   ├── videos/                 # content_1.mp4, content_1_thumb.jpg, …
│   └── avatars/                # avatar_<timestamp>.jpg (generated stills)
├── tests/
├── .env.example
└── pyproject.toml
```

---

## Setup

### 1. Python pipeline

`pip` is not available directly on macOS — use a virtual environment instead.

```bash
# Create a virtual environment inside the project directory
python3 -m venv .venv

# Activate it (run this every time you open a new terminal session)
source .venv/bin/activate

# Install the project and its dependencies
pip install -e .

# Copy the env template and fill in your keys
cp .env.example .env
```

Once the venv is active, the `thinksy` command is available. Your shell prompt will show `(.venv)` while it is active.

**To deactivate** when you're done:
```bash
deactivate
```

**Every new terminal session** requires reactivating before running `thinksy`:
```bash
source .venv/bin/activate
```

> **Note:** You do not need to reinstall after editing `.env`. Environment variables are read at runtime. Only re-run `pip install -e .` if you modify `pyproject.toml` (e.g. after adding a new dependency).

### 2. Next.js frontend

```bash
cd web
npm install
npm run dev        # dev server at http://localhost:3000
```

### 3. Database

The database is created automatically on first run. No migrations needed.

---

## Environment variables

```bash
# AI — required
ANTHROPIC_API_KEY=sk-ant-...

# HeyGen — required for video generation
HEYGEN_API_KEY=
HEYGEN_AVATAR_ID=           # Studio/Instant avatar ID (HeyGen > Avatars)
HEYGEN_VOICE_ID=            # Voice ID (GET /v2/voices)
HEYGEN_AVATAR_GROUP_ID=     # Photo avatar group ID — only needed for still image generation
                             # (HeyGen > Photo Avatars > your group)

# Instagram — required for posting
INSTAGRAM_USER_ID=17841400...
INSTAGRAM_ACCESS_TOKEN=EAA...

# YouTube — required for posting
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=

# Pipeline settings — optional, defaults shown
DB_PATH=./data/thinksy.db
APPROVAL_MODE=human          # human | auto
PUBLIC_VIDEO_HOST=https://thinksy.ai
GOOGLE_INDEXING_KEY_PATH=    # Path to service-account JSON (optional)
```

**Where to find the HeyGen IDs:**
- `HEYGEN_AVATAR_ID` — HeyGen dashboard → Avatars → click your avatar → copy the ID
- `HEYGEN_VOICE_ID` — call `GET https://api.heygen.com/v2/voices` with your API key
- `HEYGEN_AVATAR_GROUP_ID` — HeyGen dashboard → Photo Avatars → your group → copy the group ID

---

## CLI reference

### `thinksy generate <INSTRUCTION>`

The main command. Runs the full pipeline end to end.

```bash
thinksy generate "accounting software for freelancers"

# Options
--count,     -n  INT      Number of scripts to generate (default: 3)
--category,  -c  TEXT     Force a category: hr | accounting | project_management
--auto                    Skip all human approval gates
--skip-video              Stop after script approval (no video)
--skip-post               Stop after video approval (no social posting)
--verbose,   -v           Debug logging
```

### `thinksy review`

Interactively approve or reject scripts that are waiting in `script_draft` status.

```bash
thinksy review
```

### `thinksy status`

Print a count of content items at each pipeline stage.

```bash
thinksy status

# Output example:
# script_draft      3
# video_ready       2
# posted_instagram  1
# completed         1
```

### `thinksy ls [STAGE]`

List content items, optionally filtered by stage.

```bash
thinksy ls                  # all items
thinksy ls script_draft     # items awaiting approval
thinksy ls completed        # finished items
```

### `thinksy engage <HASHTAGS>`

Search Instagram hashtags and post AI-generated comments (rate-limited to 12/hour).

```bash
thinksy engage "#HRTech,#SaaS" --max 10
```

### `thinksy geo`

Generate geo-targeted landing pages for the top US metros, stored in the database and rendered by the Next.js frontend.

```bash
thinksy geo
thinksy geo --category hr --cities 10
```

### `thinksy seo_update`

Generate missing SEO metadata for videos, rebuild the Next.js site, and optionally submit new URLs to Google's Indexing API.

```bash
thinksy seo_update
```

### `thinksy web`

Start the Next.js dev server.

```bash
thinksy web
```

---

## End-to-end example walkthrough

This example generates three HR software video ads, reviews them, and publishes everything.

### Step 1 — Generate scripts

```bash
thinksy generate "HR software for small businesses" --count 3 --skip-video
```

Claude classifies the instruction as the `hr` category, then writes three scripts. Each has a hook (opening line), full narration (15–30 seconds), and a call to action. They land in the database with status `script_draft`.

Check what was produced:

```bash
thinksy ls script_draft
```

```
#1  hr  "Still manually tracking PTO in a spreadsheet?"
#2  hr  "Your HR team is spending 6 hours a week on paperwork that software could handle in seconds."
#3  hr  "What if onboarding a new hire took 10 minutes instead of 10 days?"
```

### Step 2 — Review and approve scripts

```bash
thinksy review
```

The CLI shows each script in full and asks `approve / reject / edit`. Approved scripts move to `script_approved`. Rejected ones are marked `failed` and skipped.

Or skip this step entirely in CI/batch mode:

```bash
thinksy generate "HR software for small businesses" --count 3 --auto
```

### Step 3 — Generate videos

Resume from approved scripts:

```bash
thinksy generate "HR software for small businesses" --skip-post
```

For each approved script the `VideoProducerAgent`:

1. Combines the hook and narration into spoken text
2. Calls `POST https://api.heygen.com/v2/video/generate` with your avatar and voice IDs
3. Polls `GET /v1/video_status.get` every 10 seconds until the render completes (up to 10 minutes)
4. Downloads the video to `data/videos/content_<id>.mp4`
5. Downloads the HeyGen-provided thumbnail to `data/videos/content_<id>_thumb.jpg`
6. Writes a row to the `videos` table with status `video_ready`

Check progress:

```bash
thinksy status
# video_ready  3
```

### Step 4 — Review videos

```bash
thinksy review
```

The CLI lists each video with its local path so you can preview it before approving. Approved videos move to `video_approved`.

### Step 5 — Post to Instagram and YouTube

```bash
thinksy generate "HR software for small businesses" --skip-video
# (or just let the full pipeline reach this step)
```

Instagram and YouTube posting run in parallel:

**Instagram Reels**
1. Claude generates a caption (hook-first, 150–200 words)
2. Claude generates 25 hashtags (or falls back to a curated list)
3. Graph API v21.0 creates a media container with the video URL
4. The agent polls the container until ready, then publishes
5. A row is written to `instagram_posts`

**YouTube Shorts**
1. Claude generates an SEO-optimised title (≤60 chars), description (200–300 words), and 15–20 tags
2. The video is uploaded via YouTube Data API v3 with resumable upload
3. A row is written to `youtube_uploads`

Status after posting:

```bash
thinksy status
# posted_instagram  3
# posted_youtube    3
```

### Step 6 — Rebuild the site

The `FrontendSEOAgent` runs automatically after posting, or you can trigger it manually:

```bash
thinksy seo_update
```

It:

1. Generates SEO metadata for each new video (page title, meta description, OG tags, keywords)
2. Generates geo-targeted landing pages for the top 20 US metros × categories (e.g. `/hr-software-austin-tx`)
3. Runs `npm run build` inside the `web/` directory
4. Submits new URLs to Google's Indexing API if a service-account key is configured

The finished site has:
- A home page at `/` with all published videos
- Individual video pages at `/videos/<id>` with schema.org VideoObject markup
- Geo pages at `/<slug>` with schema.org WebPage + SoftwareApplication markup
- A dynamic sitemap at `/sitemap.xml`

---

## Generating avatar images

If you want still images of your avatar for use as profile pictures, thumbnails, or marketing assets — separate from videos — use the Photo Avatar API:

```bash
# In Python (e.g. a one-off script or future CLI command)
from pipeline.config import Config
from pipeline.db import Database
from pipeline.video_producer.agent import VideoProducerAgent

config = Config()
db = Database(config.db_path)
agent = VideoProducerAgent(config, db)

path = agent.generate_avatar_image(
    "avatar presenting HR software dashboard in a modern office"
)
print(path)  # ./data/avatars/avatar_1712345678.jpg
```

Requires `HEYGEN_AVATAR_GROUP_ID` to be set. Images are saved to `data/avatars/`.

---

## Database schema

All pipeline state is stored in a single SQLite file.

| Table | Purpose |
|---|---|
| `content_items` | Scripts (hook, narration, CTA, category, status) |
| `videos` | Generated video files and HeyGen metadata |
| `instagram_posts` | Instagram media IDs, captions, hashtags |
| `youtube_uploads` | YouTube video IDs, titles, descriptions |
| `seo_metadata` | Per-video SEO fields (title, description, OG, keywords) |
| `geo_pages` | Geo-targeted landing pages (slug, city, benefits, CTA) |
| `workflow_log` | Append-only audit trail of every agent action |

### Content status lifecycle

```
IDEA → SCRIPT_DRAFT → SCRIPT_APPROVED → VIDEO_GENERATING → VIDEO_READY
     → VIDEO_APPROVED → POSTING → POSTED_INSTAGRAM / POSTED_YOUTUBE → COMPLETED
                                                                     → FAILED
```

---

## Agent overview

| Agent | File | What it does |
|---|---|---|
| `OrchestratorAgent` | `orchestrator/agent.py` | Coordinates all agents, manages approval gates |
| `ContentStrategistAgent` | `content_strategist/agent.py` | Writes scripts with Claude |
| `VideoProducerAgent` | `video_producer/agent.py` | Generates videos and avatar images via HeyGen |
| `InstagramAgent` | `instagram/agent.py` | Posts Reels via Graph API |
| `YouTubeAgent` | `youtube/agent.py` | Uploads Shorts via Data API v3 |
| `FrontendSEOAgent` | `frontend/agent.py` | SEO metadata, geo pages, site rebuild, Google submission |
| `EngagementAgent` | `instagram/engagement.py` | Comments on hashtag posts (rate-limited) |

---

## Web frontend

The Next.js app in `web/` reads the SQLite database directly via `better-sqlite3`. There is no API layer.

| Route | Page |
|---|---|
| `/` | Home — grid of all published videos |
| `/videos/<id>` | Video detail — player, script, CTA, schema.org markup |
| `/<geo-slug>` | Geo landing page — local intro, benefits grid, filtered video grid |
| `/sitemap.xml` | Dynamic sitemap covering all pages |

Run locally:

```bash
cd web && npm run dev
```

Build for production:

```bash
cd web && npm run build && npm start
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Script generation | Anthropic Claude (claude-sonnet-4) |
| Video generation | HeyGen avatar video API |
| Social posting | Instagram Graph API v21, YouTube Data API v3 |
| SEO submission | Google Indexing API |
| Backend language | Python 3.11+, Typer, Pydantic, Requests |
| Frontend framework | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| Database | SQLite 3 (WAL mode, shared between pipeline and frontend) |
