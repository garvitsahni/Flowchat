"""FloatChat backend — FastAPI app. Endpoints: /query, /health.

Run on Windows with `--loop app.loops:selector_loop_factory` (psycopg async
needs a SelectorEventLoop; uvicorn's default Proactor loop breaks it).
"""

from __future__ import annotations

import logging

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


def _graceful_refusal(explanation: str, language: str) -> QueryResponse:
    return QueryResponse(
        answer_text=explanation if language == "en" else (
            "यह प्रश्न वर्तमान डेटासेट के दायरे से बाहर है।"
        ),
        language=language,
        chart_type="none",
        confidence="high",
        confidence_note="",
        explainability=Explainability(sql="", floats_used=[], qc_excluded_count=0),
    )


def _extract_year_month(period: str) -> str | None:
    if "-" in period:
        return period.split("-")[0]
    return None


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

    try:
        statements = guardrails.validate_sql(generated.sql)
    except GuardrailViolation as exc:
        logger.warning("Guardrail rejection: %s", exc.reason)
        return _graceful_refusal("I couldn't safely answer that question.", req.language)

    rows_by_statement = await execute_statements(statements)
    result = build_result(
        rows_by_statement,
        region=generated.requested_region,
        period=generated.requested_period,
    )

    if not result.rows or all(not r for r in rows_by_statement):
        return _graceful_refusal(
            "No data available for this region and time period.",
            req.language,
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

    float_ids = result.float_ids or [r["float_id"] for r in result.rows if r.get("float_id")]
    if not float_ids:
        float_ids = await _floats_in_scope(result, generated)

    return QueryResponse(
        answer_text=answer_text,
        language=req.language,
        chart_type=generated.intent_type if generated.intent_type in {
            "depth_profile", "trajectory", "time_series", "comparison",
        } else "none",
        chart_data=viz.shape(result, generated.intent_type),
        confidence=confidence.confidence,
        confidence_note=confidence.note,
        explainability=Explainability(
            sql=generated.sql,
            floats_used=float_ids,
            qc_excluded_count=confidence.qc_excluded_count,
            time_range_queried=generated.requested_period,
        ),
    )


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