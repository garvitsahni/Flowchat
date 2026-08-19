"""Gemini provider scaffold.

Activates when LLM_PROVIDER=gemini AND GEMINI_API_KEY is set. Until then the app falls
back to the mock resolver (see orchestrator/mock.py provider_factory).

Day 1 scope: the client + two-call shape (generate_sql / phrase_answer) mirroring the
prompts in SCHEMA_AND_PROMPTS.md §2-3. Populate the call bodies once keys are available.
"""

from __future__ import annotations

from .base import GeneratedSQL, QueryResult


class GeminiProvider:
    name = "gemini"

    def generate_sql(self, question: str, language: str = "en") -> GeneratedSQL:
        raise NotImplementedError(
            "GeminiProvider.generate_sql is a Day 1 scaffold — provide GEMINI_API_KEY "
            "and LLM_PROVIDER=gemini to enable. Falling back to mock is automatic."
        )

    def phrase_answer(self, result: QueryResult, confidence: str) -> str:
        raise NotImplementedError("GeminiProvider.phrase_answer is a Day 1 scaffold.")