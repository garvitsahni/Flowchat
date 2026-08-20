"""OpenRouter provider — real implementation.

Activates when LLM_PROVIDER=openrouter AND OPENROUTER_API_KEY is set. Uses the
OpenAI-compatible /chat/completions endpoint over httpx.
"""

from __future__ import annotations

import logging

import httpx

from ..config import settings
from .llm import LLMChatProvider

logger = logging.getLogger("floatchat")

_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterProvider(LLMChatProvider):
    name = "openrouter"

    def _complete(self, messages: list[dict], *, json_mode: bool = False) -> str:
        if not settings.openrouter_api_key:
            raise NotImplementedError("OPENROUTER_API_KEY is not set.")

        resp = httpx.post(
            _API_URL,
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openrouter_model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 4096,
            },
            timeout=90.0,
        )
        resp.raise_for_status()
        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
            # Handle OpenRouter content filter responses
            if content and content.startswith("User Safety:"):
                logger.warning("OpenRouter content filter triggered: %s", content)
                return ""
            return content
        except (KeyError, IndexError, TypeError):
            logger.warning("OpenRouter reply missing choices: %s", data)
            return ""