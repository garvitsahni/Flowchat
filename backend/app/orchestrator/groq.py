"""Groq provider — real implementation.

Activates when LLM_PROVIDER=groq AND GROQ_API_KEY is set. Uses Groq's
OpenAI-compatible /chat/completions endpoint over httpx. Reasoning models
(gpt-oss, qwen) need the OpenAI-style `max_completion_tokens` param — Groq
rejects `max_tokens` for them — and their ` thinking` blocks would burn the
token budget, so a non-reasoning default is preferred.
"""

from __future__ import annotations

import logging

import httpx

from ..config import settings
from .llm import LLMChatProvider

logger = logging.getLogger("floatchat")

_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProvider(LLMChatProvider):
    name = "groq"

    def _complete(self, messages: list[dict], *, json_mode: bool = False) -> str:
        if not settings.groq_api_key:
            raise NotImplementedError("GROQ_API_KEY is not set.")

        resp = httpx.post(
            _API_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_model,
                "messages": messages,
                "temperature": 0.0,
                "max_completion_tokens": 2048,
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            logger.warning("Groq reply missing choices: %s", data)
            return ""