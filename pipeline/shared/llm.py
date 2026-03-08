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
        try:
            message = self.client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            return message.content[0].text
        except anthropic.AuthenticationError:
            raise RuntimeError(
                "Invalid Anthropic API key. Check ANTHROPIC_API_KEY in your .env file."
            )
        except anthropic.BadRequestError as e:
            msg = str(e)
            if "credit balance" in msg.lower():
                raise RuntimeError(
                    "Anthropic API credits exhausted. "
                    "Add credits at https://console.anthropic.com → Plans & Billing."
                )
            raise RuntimeError(f"Anthropic bad request: {msg}")
        except anthropic.RateLimitError:
            raise RuntimeError(
                "Anthropic API rate limit hit. Wait a moment and try again."
            )
        except anthropic.APIConnectionError:
            raise RuntimeError(
                "Could not reach the Anthropic API. Check your internet connection."
            )

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
