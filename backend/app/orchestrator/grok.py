"""Grok (xAI) provider scaffold.

Activates when LLM_PROVIDER=grok AND GROK_API_KEY is set. Same contract as the mock
provider; call bodies are Day 1 scaffolds pending keys.
"""

from __future__ import annotations

from .base import GeneratedSQL, QueryResult


class GrokProvider:
    name = "grok"

    def generate_sql(self, question: str, language: str = "en") -> GeneratedSQL:
        raise NotImplementedError(
            "GrokProvider.generate_sql is a Day 1 scaffold — provide GROK_API_KEY and "
            "LLM_PROVIDER=grok to enable."
        )

    def phrase_answer(self, result: QueryResult, confidence: str) -> str:
        raise NotImplementedError("GrokProvider.phrase_answer is a Day 1 scaffold.")