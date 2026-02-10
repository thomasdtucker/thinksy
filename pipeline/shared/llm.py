from __future__ import annotations

import json
import logging

import anthropic

logger = logging.getLogger(__name__)


class ClaudeClient:
    def __init__(self, api_key: str) -> None:
        self.client = anthropic.Anthropic(api_key=api_key)

    def chat(
        self,
        system: str,
        user: str,
        model: str = "claude-sonnet-4-20250514",
        max_tokens: int = 4096,
    ) -> str:
        message = self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return message.content[0].text

    def chat_json(self, system: str, user: str, **kwargs: object) -> dict | list:
        text = self.chat(
            system=system,
            user=user + "\n\nRespond with valid JSON only. No markdown fences.",
            **kwargs,
        )
        # Strip markdown fences if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        return json.loads(text.strip())
