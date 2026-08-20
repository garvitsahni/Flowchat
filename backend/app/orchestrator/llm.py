"""Shared base for real (HTTP) LLM providers.

Implements the common two-call flow (generate_sql → phrase_answer) from
prompts.py on top of a per-provider `_complete(messages) -> str` hook. Each concrete
provider (gemini / openrouter / groq) only supplies the wire call.

Parsing is defensive: models sometimes wrap JSON in ``` fences or add preamble.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Protocol

from .base import GeneratedSQL, QueryResult
from . import prompts

logger = logging.getLogger("floatchat")

_INTENT_TYPES = {
    "depth_profile", "trajectory", "time_series", "comparison", "metadata", "unsupported",
}

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def extract_json_object(text: str) -> dict | None:
    """Best-effort extraction of the first JSON object from a model reply."""
    if not text:
        return None
    m = _FENCE_RE.search(text)
    if m:
        text = m.group(1)
    # Find the outermost {...} span
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        logger.warning("Could not parse provider JSON output: %s", exc)
        return None


def sanitize_sql(sql: str | None) -> str | None:
    """Return the SQL only if it looks like a read-only statement."""
    if not sql:
        return None
    s = sql.strip().strip(";").strip()
    if not s.lower().startswith("select"):
        return None
    return s


class LLMChatProvider(Protocol):
    """Minimal shape each real provider must satisfy."""

    name: str

    def _complete(self, messages: list[dict], *, json_mode: bool = False) -> str:
        """One chat completion round-trip; returns the assistant text.

        json_mode=True asks the model for strict JSON output (used for SQL generation);
        False requests plain text (used for answer phrasing).
        """
        ...

    # ------------------------------------------------------------ shared flow

    def generate_sql(self, question: str, language: str = "en") -> GeneratedSQL:
        messages = prompts.build_generate_sql_messages(question, language)
        raw = self._complete(messages, json_mode=True)
        obj = extract_json_object(raw)
        if obj is None:
            logger.warning("%s: no JSON in generate_sql reply, treating as unsupported.", self.name)
            return GeneratedSQL(
                sql=None,
                intent_type="unsupported",
                language=language,
                explanation="The question could not be translated into a valid query.",
            )

        intent = obj.get("intent_type", "")
        if intent not in _INTENT_TYPES:
            intent = "unsupported"

        sql = sanitize_sql(obj.get("sql"))

        if intent != "unsupported" and sql is None:
            # Model said supported but produced non-SELECT — be safe.
            logger.warning("%s: non-SELECT for intent %s, treating as unsupported.", self.name, intent)
            intent = "unsupported"

        return GeneratedSQL(
            sql=sql,
            intent_type=intent,
            language=language,
            explanation=str(obj.get("explanation", "") or ""),
            requested_period=str(obj.get("requested_period", "") or ""),
            requested_region=str(obj.get("requested_region", "") or ""),
        )

    def phrase_answer(self, result: QueryResult, confidence: str, language: str = "en") -> str:
        messages = prompts.build_phrase_messages(result, confidence, language)
        raw = self._complete(messages)
        text = (raw or "").strip()
        # Strip accidental JSON fences / preamble.
        obj = extract_json_object(text)
        if obj is not None and "answer" in obj:
            return str(obj["answer"])
        return text

    def semantic_validate(self, question: str, generated: GeneratedSQL) -> tuple[bool, str]:
        """Validate that the generated SQL semantically matches the user's question."""
        if generated.sql is None or generated.intent_type == "unsupported":
            return True, ""  # Unsupported questions are valid by definition

        messages = prompts.build_semantic_validate_messages(
            question, generated.sql, generated.intent_type
        )
        raw = self._complete(messages, json_mode=True)
        obj = extract_json_object(raw)
        if obj is None:
            logger.warning("%s: no JSON in semantic_validate reply, assuming valid.", self.name)
            return True, ""

        valid = obj.get("valid", True)
        reason = obj.get("reason", "")
        if not valid:
            logger.warning("%s: semantic validation failed: %s", self.name, reason)
        return valid, reason