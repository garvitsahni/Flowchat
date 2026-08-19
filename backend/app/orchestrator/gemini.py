"""Gemini provider — real implementation.

Activates when LLM_PROVIDER=gemini AND GEMINI_API_KEY is set. Uses the
google-generativeai SDK with two calls mirroring SCHEMA_AND_PROMPTS.md §2-3.
"""

from __future__ import annotations

import logging

from ..config import settings
from .base import GeneratedSQL, QueryResult
from .llm import LLMChatProvider

logger = logging.getLogger("floatchat")


class GeminiProvider(LLMChatProvider):
    name = "gemini"

    def _complete(self, messages: list[dict], *, json_mode: bool = False) -> str:
        if not settings.gemini_api_key:
            raise NotImplementedError("GEMINI_API_KEY is not set.")

        from google.genai import Client, types

        # Fail fast on capacity errors: cap retries so the app falls back to the mock
        # provider instead of hanging on Gemini's SDK backoff loop (503 spikes).
        client = Client(
            api_key=settings.gemini_api_key,
            http_options={
                "timeout": 15000,
                "api_version": "v1",
                "retry_options": {"attempts": 1},
            },
        )

        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user = next((m["content"] for m in messages if m["role"] == "user"), "")

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=user,
            config=types.GenerateContentConfig(
                system_instruction=system,
                temperature=0.2,
                max_output_tokens=2048,
                response_mime_type="application/json" if json_mode else "text/plain",
            ),
        )
        return response.text or ""