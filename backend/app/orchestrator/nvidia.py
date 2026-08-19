"""NVIDIA NIM provider — real implementation.

Activates when LLM_PROVIDER=nvidia AND NVIDIA_API_KEY is set. Uses the NVIDIA hosted
NIM OpenAI-compatible /chat/completions endpoint over httpx.
"""

from __future__ import annotations

import logging

import httpx

from ..config import settings
from .llm import LLMChatProvider

logger = logging.getLogger("floatchat")

_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"


class NvidiaProvider(LLMChatProvider):
    name = "nvidia"

    def _complete(self, messages: list[dict], *, json_mode: bool = False) -> str:
        if not settings.nvidia_api_key:
            raise NotImplementedError("NVIDIA_API_KEY is not set.")

        resp = httpx.post(
            _API_URL,
            headers={
                "Authorization": f"Bearer {settings.nvidia_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.nvidia_model,
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 2048,
            },
            timeout=180.0,
        )
        resp.raise_for_status()
        data = resp.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            logger.warning("NVIDIA NIM reply missing choices: %s", data)
            return ""