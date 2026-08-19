"""OpenRouter provider scaffold.

Activates when LLM_PROVIDER=openrouter AND OPENROUTER_API_KEY is set. Same contract as
the mock provider; call bodies are Day 1 scaffolds pending keys.
"""

from __future__ import annotations

from .base import GeneratedSQL, QueryResult


class OpenRouterProvider:
    name = "openrouter"

    def generate_sql(self, question: str, language: str = "en") -> GeneratedSQL:
        raise NotImplementedError(
            "OpenRouterProvider.generate_sql is a Day 1 scaffold — provide "
            "OPENROUTER_API_KEY and LLM_PROVIDER=openrouter to enable."
        )

    def phrase_answer(self, result: QueryResult, confidence: str) -> str:
        raise NotImplementedError("OpenRouterProvider.phrase_answer is a Day 1 scaffold.")