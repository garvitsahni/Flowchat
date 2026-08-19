"""Answer assembly — executes sanitized SQL and builds the QueryResult for phrasing.

Separate from the guardrail (validation) and the provider (NL→SQL / phrasing): this module
runs the validated statements against the read-only role and packages raw rows + the
metadata the explainability panel needs (floats used, QC-excluded count, time range).
"""

from __future__ import annotations

from .db import fetch_all
from .orchestrator.base import QueryResult


async def execute_statements(statements: list[str]) -> list[list[dict]]:
    results: list[list[dict]] = []
    for stmt in statements:
        results.append(await fetch_all(stmt))
    return results


def build_result(
    rows_by_statement: list[list[dict]],
    region: str,
    period: str,
) -> QueryResult:
    """Flatten multi-statement (comparison) output into one QueryResult."""
    merged: list[dict] = []
    for rows in rows_by_statement:
        merged.extend(rows)

    float_ids: list[str] = []
    if merged and "float_id" in merged[0]:
        float_ids = sorted({str(r["float_id"]) for r in merged if r.get("float_id")})

    return QueryResult(
        rows=merged,
        columns=list(merged[0].keys()) if merged else [],
        region=region,
        period=period,
        float_ids=float_ids,
    )


def fallback_answer(result: QueryResult, confidence: str) -> str:
    """Used when a provider returns no phrasing — never leaves the user empty."""
    if not result.rows:
        return "No data available for this region and time period."
    return "The query returned data; see the visualization."