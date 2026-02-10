from __future__ import annotations

import logging
from pathlib import Path

import requests

logger = logging.getLogger(__name__)


def download_file(url: str, dest_dir: str, filename: str) -> str:
    """Download a file from a URL and save it locally. Returns the local path."""
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    filepath = dest / filename

    logger.info("Downloading %s -> %s", url, filepath)
    resp = requests.get(url, stream=True, timeout=300)
    resp.raise_for_status()

    with open(filepath, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    logger.info("Downloaded %s (%.1f MB)", filepath, filepath.stat().st_size / 1e6)
    return str(filepath)
