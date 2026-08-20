"""FloatChat backend — FastAPI app. Endpoints: /query, /health.

Run on Windows with `--loop app.loops:selector_loop_factory` (psycopg async
needs a SelectorEventLoop; uvicorn's default Proactor loop breaks it).
"""

from __future__ import annotations

import logging
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import answers, guardrails, viz
from .answers import execute_statements, build_result
from .config import settings
from .db import close_pool, ping
from .guardrails import GuardrailViolation
from .orchestrator.mock import provider_factory
from .schemas import (
    HealthResponse,
    QueryRequest,
    QueryResponse,
    Explainability,
    UnsupportedIntent,
)
from .uncertainty import assess

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("floatchat")

app = FastAPI(title="FloatChat", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown() -> None:
    await close_pool()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", db_connected=await ping())


def _graceful_refusal(
    explanation: str, language: str, reason: str = "out_of_scope"
) -> QueryResponse:
    return QueryResponse(
        answer_text=explanation if language == "en" else (
            "यह प्रश्न वर्तमान डेटासेट के दायरे से बाहर है।"
        ),
        language=language,
        chart_type="none",
        confidence="high",
        confidence_note="",
        refusal_reason=reason,
        explainability=Explainability(sql="", floats_used=[], qc_excluded_count=0),
    )


def _extract_year_month(period: str) -> str | None:
    if "-" in period:
        return period.split("-")[0]
    return None


_EQUAL_RANGE_RE = re.compile(
    r"\b(from\s+)?(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\b",
    re.IGNORECASE,
)


def _clean_phrase(text: str) -> str:
    """Deterministically collapse equal-value ranges ('21.9 to 21.9') the LLM
    sometimes emits for single-row aggregates, leaving real ranges intact."""
    return _EQUAL_RANGE_RE.sub(
        lambda m: m.group(2) if m.group(2) == m.group(3) else m.group(0),
        text,
    )


def _semantic_validate_with_retry(provider, question: str, language: str) -> tuple:
    """Run semantic validation with retries. Returns (generated, valid, reason)."""
    if not settings.semantic_validation_enabled:
        generated = provider.generate_sql(question, language)
        return generated, True, ""

    max_retries = settings.semantic_max_retries
    for attempt in range(max_retries + 1):
        generated = provider.generate_sql(question, language)
        if generated.sql is None:
            # Unsupported intent — no validation needed
            return generated, True, ""

        valid, reason = provider.semantic_validate(question, generated)
        if valid:
            return generated, True, ""

        logger.warning(
            "Semantic validation failed (attempt %d/%d): %s — regenerating SQL",
            attempt + 1, max_retries + 1, reason
        )
        if attempt == max_retries:
            logger.error(
                "Max semantic validation retries (%d) exceeded; proceeding with last SQL (fail-open)",
                max_retries
            )
            return generated, False, reason

    # Should not reach here, but fail-open
    return generated, True, ""


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest) -> QueryResponse:
    provider = provider_factory(settings.llm_provider)

    try:
        generated = provider.generate_sql(req.question, req.language)
    except NotImplementedError:
        # Provider scaffold with no key — fall back to the deterministic mock.
        logger.warning("Provider %s not implemented; using mock.", provider.name)
        from .orchestrator.mock import MockProvider

        provider = MockProvider()
        generated = provider.generate_sql(req.question, req.language)
    except Exception:
        # Transient provider API failure — degrade to the deterministic mock rather
        # than surfacing a 500. Mock still generates real SQL against the real schema.
        logger.exception("Provider %s failed during SQL generation; using mock.", provider.name)
        from .orchestrator.mock import MockProvider

        provider = MockProvider()
        generated = provider.generate_sql(req.question, req.language)

    if generated.sql is None:
        return _graceful_refusal(generated.explanation, req.language)

    # Semantic validation: ensure generated SQL matches user intent
    generated, valid, reason = _semantic_validate_with_retry(provider, req.question, req.language)
    if not valid:
        logger.warning("Semantic validation failed after retries: %s — proceeding anyway (fail-open)", reason)

    if generated.sql is None:
        return _graceful_refusal(generated.explanation, req.language)

    try:
        statements = guardrails.validate_sql(generated.sql)
    except GuardrailViolation as exc:
        logger.warning("Guardrail rejection: %s — falling back to mock provider.", exc.reason)
        from .orchestrator.mock import MockProvider

        mock = MockProvider()
        generated = mock.generate_sql(req.question, req.language)
        if generated.sql is None:
            return _graceful_refusal(generated.explanation, req.language)
        try:
            statements = guardrails.validate_sql(generated.sql)
        except GuardrailViolation as exc2:
            logger.warning("Mock SQL also rejected: %s", exc2.reason)
            return _graceful_refusal(
                "I couldn't safely answer that question.", req.language, reason="unsafe"
            )

    rows_by_statement: list[list[dict]] | None = None
    try:
        rows_by_statement = await execute_statements(statements)
    except Exception:
        # Invalid-but-schema-valid SQL (e.g. a subquery the small model botched) must
        # degrade gracefully — fall back to the deterministic mock's SQL before refusing.
        logger.exception(
            "Executing validated SQL failed; retrying with mock provider. SQL=%s", generated.sql
        )
        from .orchestrator.mock import MockProvider

        mock = MockProvider()
        generated = mock.generate_sql(req.question, req.language)
        if generated.sql is None:
            return _graceful_refusal(generated.explanation, req.language)
        try:
            statements = guardrails.validate_sql(generated.sql)
            rows_by_statement = await execute_statements(statements)
        except Exception:
            logger.exception("Mock fallback also failed; refusing gracefully.")
            return _graceful_refusal(
                "I couldn't safely answer that question.", req.language, reason="unsafe"
            )

    result = build_result(
        rows_by_statement,
        region=generated.requested_region,
        period=generated.requested_period,
    )

    if not result.rows or all(
        all(v is None or v == "" for v in r.values()) for r in result.rows
    ):
        return _graceful_refusal(
            "No data available for this region and time period.",
            req.language,
            reason="no_data",
        )

    year_month = _extract_year_month(generated.requested_period)
    confidence = await assess(result.region or generated.requested_region, year_month)
    result.qc_excluded_count = confidence.qc_excluded_count

    try:
        answer_text = provider.phrase_answer(result, confidence.confidence, req.language)
    except Exception:
        logger.exception("Provider %s failed during phrasing; using fallback.", provider.name)
        answer_text = ""
    if not answer_text:
        answer_text = answers.fallback_answer(result, confidence.confidence)
    answer_text = _clean_phrase(answer_text)

    float_ids = result.float_ids or [r["float_id"] for r in result.rows if r.get("float_id")]
    if not float_ids:
        float_ids = await _floats_in_scope(result, generated)

    explanations = _build_explanations(
        float_ids, confidence.qc_excluded_count, generated.requested_period, req.language
    )

    return QueryResponse(
        answer_text=answer_text,
        language=req.language,
        chart_type=generated.intent_type if generated.intent_type in {
            "depth_profile", "trajectory", "time_series", "comparison", "heatmap",
        } else "none",
        chart_data=viz.shape(result, generated.intent_type),
        confidence=confidence.confidence,
        confidence_note=confidence.note,
        explainability=Explainability(
            sql=generated.sql,
            floats_used=float_ids,
            qc_excluded_count=confidence.qc_excluded_count,
            time_range_queried=generated.requested_period,
            explanations=explanations,
        ),
    )


def _build_explanations(
    floats_used: list[str], qc_excluded_count: int, time_range: str, language: str
) -> dict[str, str]:
    """Build simple explanations for explainability terms."""
    if language == "hi":
        return {
            "floats_used": f"{len(floats_used)} फ्लोट्स (समुद्री डेटा एकत्र करने वाले उपकरण) का उपयोग किया गया",
            "qc_excluded": f"{qc_excluded_count} रीडिंग्स गुणवत्ता जांच में विफल होने के कारण बाहर रखी गईं",
            "time_range": f"डेटा अवधि: {time_range}" if time_range else "कोई विशिष्ट समय सीमा नहीं",
            "sql": "यह वह डेटाबेस क्वेरी है जिसका उपयोग डेटा प्राप्त करने के लिए किया गया",
        }
    return {
        "floats_used": f"{len(floats_used)} ARGO floats (ocean data collectors) were used for this answer",
        "qc_excluded": f"{qc_excluded_count} readings were excluded because they failed quality checks",
        "time_range": f"Data covers: {time_range}" if time_range else "No specific time range",
        "sql": "This is the database query used to fetch the data",
    }


async def _floats_in_scope(result, generated) -> list[str]:
    """Fallback float attribution when the query didn't select float_id."""
    try:
        from .db import fetch_all

        where = ""
        params: tuple = ()
        if generated.requested_region:
            where = "WHERE region = %s"
            params = (generated.requested_region,)
        rows = await fetch_all(
            f"SELECT DISTINCT float_id FROM argo_profiles {where} ORDER BY float_id LIMIT 20",
            params,
        )
        return [r["float_id"] for r in rows]
    except Exception:
        return []