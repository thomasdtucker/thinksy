from __future__ import annotations

import logging
import time

import requests

from ..shared.retry import retry

logger = logging.getLogger(__name__)

HEYGEN_API_BASE = "https://api.heygen.com"


class HeyGenClient:
    """Wrapper around HeyGen API for avatar video and image generation."""

    def __init__(
        self,
        api_key: str,
        avatar_id: str,
        voice_id: str,
        avatar_scale: float = 1.0,
        video_width: int = 0,
        video_height: int = 0,
    ) -> None:
        self.avatar_id = avatar_id
        self.voice_id = voice_id
        self.avatar_scale = avatar_scale
        self.video_width = video_width
        self.video_height = video_height
        self.session = requests.Session()
        self.session.headers.update(
            {
                "X-Api-Key": api_key.strip(),  # strip whitespace that silently breaks auth
                "Content-Type": "application/json",
            }
        )

    def _check_response(self, resp: requests.Response) -> None:
        """Raise a clear error for known failure codes; let 5xx bubble as HTTPError for retry."""
        if resp.ok:
            return
        if resp.status_code == 401:
            raise RuntimeError(
                "HeyGen API key rejected (401). "
                "Check HEYGEN_API_KEY in your .env — look for extra spaces or quotes."
            )
        if resp.status_code == 403:
            raise RuntimeError(
                "HeyGen API key does not have permission for this action (403). "
                "Check that your plan supports avatar video generation."
            )
        if resp.status_code == 422:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise RuntimeError(f"HeyGen rejected the request (422): {detail}")
        if resp.status_code == 404:
            raise RuntimeError(
                "HeyGen returned 404 — avatar ID not found. "
                "Check HEYGEN_AVATAR_ID / HEYGEN_AVATAR_LOOK_IDS in your .env. "
                "Use the UUID from HeyGen > Avatars, not a display name."
            )
        if resp.status_code == 429:
            raise RuntimeError(
                "HeyGen rate limit reached (429). Wait a moment and try again."
            )
        # 5xx and anything else: raise HTTPError so the retry decorator can handle it
        resp.raise_for_status()

    @retry(max_attempts=3, exceptions=(requests.HTTPError, requests.ConnectionError, requests.Timeout))
    def generate_video(
        self,
        script: str,
        title: str = "",
        look_ids: list[str] | None = None,
        variation_index: int = 0,
    ) -> tuple[str, str, str | None]:
        """Submit an avatar video job. Returns (video_id, video_url, thumbnail_url).

        look_ids: list of avatar look IDs (different outfits). Cycles by variation_index.
        variation_index: position in the current batch, used to cycle through looks.
        """
        avatar_id = self.avatar_id
        if look_ids:
            avatar_id = look_ids[variation_index % len(look_ids)]

        logger.info(
            "Submitting HeyGen video (look=%s): %s",
            avatar_id,
            script[:80],
        )
        resp = self.session.post(
            f"{HEYGEN_API_BASE}/v2/video/generate",
            json={
                "video_inputs": [
                    {
                        "character": {
                            "type": "avatar",
                            "avatar_id": avatar_id,
                            "avatar_style": "normal",
                            "scale": self.avatar_scale,
                        },
                        "voice": {
                            "type": "text",
                            "voice_id": self.voice_id,
                            "input_text": script,
                        },
                    }
                ],
                **({"dimension": {"width": self.video_width, "height": self.video_height}}
                   if self.video_width and self.video_height else {}),
                **({"title": title} if title else {}),
            },
        )
        self._check_response(resp)
        video_id = resp.json()["data"]["video_id"]
        video_url, thumbnail_url = self._poll_video(video_id)
        return video_id, video_url, thumbnail_url

    @retry(max_attempts=3, exceptions=(requests.HTTPError, requests.ConnectionError, requests.Timeout))
    def generate_video_agent(
        self,
        prompt: str,
        avatar_id: str | None = None,
        orientation: str = "portrait",
        duration_sec: int | None = None,
    ) -> tuple[str, str, str | None]:
        """Submit a Video Agent job. Returns (video_id, video_url, thumbnail_url).

        The Video Agent analyses the prompt and autonomously creates a multi-scene
        video with transitions, graphics, and background music.
        Endpoint: POST /v1/video_agent/generate
        """
        logger.info("Submitting HeyGen Video Agent job: %s", prompt[:120])
        config: dict = {"orientation": orientation}
        if avatar_id:
            config["avatar_id"] = avatar_id
        if duration_sec:
            config["duration_sec"] = duration_sec
        payload: dict = {"prompt": prompt, "config": config}
        resp = self.session.post(
            f"{HEYGEN_API_BASE}/v1/video_agent/generate",
            json=payload,
        )
        self._check_response(resp)
        video_id = resp.json()["data"]["video_id"]
        video_url, thumbnail_url = self._poll_video(video_id, timeout=900)
        return video_id, video_url, thumbnail_url

    def _poll_video(self, video_id: str, timeout: int = 600) -> tuple[str, str | None]:
        """Poll until the video is complete. Returns (video_url, thumbnail_url)."""
        start = time.time()
        while time.time() - start < timeout:
            resp = self.session.get(
                f"{HEYGEN_API_BASE}/v1/video_status.get",
                params={"video_id": video_id},
            )
            self._check_response(resp)
            data = resp.json()["data"]

            status = data.get("status")
            if status == "completed":
                return data["video_url"], data.get("thumbnail_url")
            elif status == "failed":
                error = data.get("error") or {}
                if isinstance(error, dict):
                    code = error.get("code", "")
                    message = error.get("message") or error.get("detail") or "Unknown error"
                else:
                    code, message = "", str(error)
                if "INSUFFICIENT_CREDIT" in code or "credit" in message.lower():
                    raise RuntimeError(
                        "HeyGen has insufficient credits. "
                        "Top up at https://app.heygen.com/settings?tab=billing"
                    )
                raise RuntimeError(f"HeyGen video generation failed: {message}")

            logger.debug("HeyGen video %s status: %s", video_id, status)
            time.sleep(10)

        raise TimeoutError(f"HeyGen video {video_id} timed out after {timeout}s")

    @retry(max_attempts=3, exceptions=(requests.HTTPError, requests.ConnectionError, requests.Timeout))
    def generate_avatar_image(
        self,
        group_id: str,
        prompt: str,
        pose: str = "half_body",
        orientation: str = "vertical",
        style: str = "Realistic",
    ) -> str:
        """Generate a still image of the avatar using the Photo Avatar looks API.

        group_id: the avatar's photo group ID (HEYGEN_AVATAR_GROUP_ID in config)
        prompt: scene/appearance description — must contain the word "avatar"
        Returns the image URL.
        """
        logger.info("Generating avatar image: %s", prompt[:80])
        resp = self.session.post(
            f"{HEYGEN_API_BASE}/v2/photo_avatar/look/generate",
            json={
                "group_id": group_id,
                "prompt": prompt if "avatar" in prompt.lower() else f"avatar {prompt}",
                "pose": pose,
                "orientation": orientation,
                "style": style,
            },
        )
        self._check_response(resp)
        generation_id = resp.json()["data"]["generation_id"]
        return self._poll_avatar_generation(generation_id)

    def _poll_avatar_generation(self, generation_id: str, timeout: int = 300) -> str:
        """Poll until an avatar image generation is complete. Returns the image URL."""
        start = time.time()
        while time.time() - start < timeout:
            resp = self.session.get(
                f"{HEYGEN_API_BASE}/v2/photo_avatar/generation/{generation_id}",
            )
            self._check_response(resp)
            data = resp.json()["data"]

            status = data.get("status")
            if status == "success":
                return data["image_url"]
            elif status == "failed":
                raise RuntimeError(f"Avatar image generation {generation_id} failed")

            logger.debug("Avatar generation %s status: %s", generation_id, status)
            time.sleep(5)

        raise TimeoutError(
            f"Avatar image generation {generation_id} timed out after {timeout}s"
        )
