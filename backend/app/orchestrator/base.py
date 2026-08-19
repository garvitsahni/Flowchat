"""LLM provider abstraction.

Every provider (mock, Gemini, OpenRouter, Grok) implements this protocol. The app picks
one via the LLM_PROVIDER setting and the configured provider object from provider_factory.
Mock is the default until real API keys are added (Day 1 decision).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class GeneratedSQL:
    sql: str | None
    intent_type: str  # depth_profile | trajectory | time_series | comparison | unsupported
    language: str
    explanation: str = ""
    requested_period: str = ""  # for explainability time_range display
    requested_region: str = ""


@dataclass
class QueryResult:
    rows: list[dict] = field(default_factory=list)
    columns: list[str] = field(default_factory=list)
    region: str = ""
    period: str = ""
    float_ids: list[str] = field(default_factory=list)
    qc_excluded_count: int = 0


class LLMProvider(Protocol):
    name: str

    def generate_sql(self, question: str, language: str) -> GeneratedSQL:
        """Turn a natural-language question into validated SQL + intent metadata."""
        ...

    def phrase_answer(self, result: QueryResult, confidence: str, language: str = "en") -> str:
        """Turn raw result rows into a natural-language answer (phrasing pass)."""
        ...