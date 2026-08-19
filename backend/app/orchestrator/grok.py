"""Grok (xAI) provider — real implementation.

Activates when LLM_PROVIDER=grok AND GROK_API_KEY is set. Uses the xAI
OpenAI-compatible /chat/completions endpoint over httpx.
"""

from __future__ import annotations

import logging

import httpx

from ..config import settings
from .llm import LLMChatProvider

logger = logging.getLogger("floatchat")

_API_URL = "https://api.x.ai/v1/chat/completions"


class GrokProvider(LLMChatProvider):
    name = "grok"

    def _complete(self, messages: list[dict]) -> str:
        if not settings.grok_api_key:
            raise NotImplementedError("GROK_API_KEY is not set.")

        resp = httpx.post(
            _API_URL,
            headers={
                "Authorization": f"Bearer {settings.grok_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "grok-x",
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 2048,
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            logger.warning("Grok reply missing choices: %s", data)
            return ""