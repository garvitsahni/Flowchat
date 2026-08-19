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

    def _complete(self, messages: list[dict]) -> str:
        if not settings.gemini_api_key:
            raise NotImplementedError("GEMINI_API_KEY is not set.")

        import google.generativeai as genai

        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        system = next((m["content"] for m in messages if m["role"] == "system"), "")
        user = next((m["content"] for m in messages if m["role"] == "user"), "")
        prompt = f"{system}\n\n{user}"

        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=2048,
                response_mime_type="application/json",
            ),
        )
        return response.text or ""