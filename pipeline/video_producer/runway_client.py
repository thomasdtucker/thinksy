from __future__ import annotations

import logging
import time

import requests

from ..shared.retry import retry

logger = logging.getLogger(__name__)

RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1"


class RunwayClient:
    """Wrapper around Runway Gen API for image and video generation."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {api_key}",
                "X-Runway-Version": "2024-11-06",
                "Content-Type": "application/json",
            }
        )

    @retry(max_attempts=3, exceptions=(requests.RequestException,))
    def generate_image(self, prompt: str, ratio: str = "1080:1920") -> str:
        """Generate an image from text. Returns the image URL."""
        logger.info("Generating image from prompt: %s", prompt[:80])
        resp = self.session.post(
            f"{RUNWAY_API_BASE}/image_to_video",  # Runway text-to-image
            json={
                "promptText": prompt,
                "model": "gen4_image",
                "ratio": ratio,
            },
        )
        resp.raise_for_status()
        task_id = resp.json()["id"]
        return self._poll_task(task_id)

    @retry(max_attempts=3, exceptions=(requests.RequestException,))
    def generate_video(
        self,
        prompt_image_url: str,
        prompt_text: str,
        duration: int = 5,
        ratio: str = "1080:1920",
    ) -> str:
        """Generate a video from an image + text prompt. Returns the video URL."""
        logger.info("Generating video: %s", prompt_text[:80])
        resp = self.session.post(
            f"{RUNWAY_API_BASE}/image_to_video",
            json={
                "promptImage": prompt_image_url,
                "promptText": prompt_text,
                "model": "gen4_turbo",
                "duration": duration,
                "ratio": ratio,
            },
        )
        resp.raise_for_status()
        task_id = resp.json()["id"]
        return self._poll_task(task_id)

    def _poll_task(self, task_id: str, timeout: int = 600) -> str:
        """Poll a Runway task until completion. Returns the output URL."""
        start = time.time()
        while time.time() - start < timeout:
            resp = self.session.get(f"{RUNWAY_API_BASE}/tasks/{task_id}")
            resp.raise_for_status()
            data = resp.json()

            status = data.get("status")
            if status == "SUCCEEDED":
                output = data.get("output", [])
                if output:
                    return output[0]
                raise RuntimeError(f"Task {task_id} succeeded but no output")
            elif status == "FAILED":
                error = data.get("failure", "Unknown error")
                raise RuntimeError(f"Runway task {task_id} failed: {error}")

            logger.debug("Task %s status: %s", task_id, status)
            time.sleep(10)

        raise TimeoutError(f"Runway task {task_id} timed out after {timeout}s")
