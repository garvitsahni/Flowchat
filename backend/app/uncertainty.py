"""Uncertainty engine — confidence from real float density + QC quality.

Two signals per SCHEMA_AND_PROMPTS.md §2 example 5:
  - float_count < min_float_count (3)  → low, "limited float coverage"
  - qc_pass_ratio < min_qc_pass_ratio (0.7) → low, "high proportion of readings
    failed quality checks"

Checks precomputed qc_stats — a table lookup, not a live aggregation.
"""

from __future__ import annotations

from dataclasses import dataclass

from .config import settings
from .db import fetch_all


@dataclass
class ConfidenceResult:
    confidence: str  # "high" | "low"
    note: str = ""
    float_count: int | None = None
    qc_pass_ratio: float | None = None
    qc_excluded_count: int = 0


async def assess(region: str, year_month: str | None = None) -> ConfidenceResult:
    """Assess confidence for a region/period from qc_stats."""
    if not region:
        return ConfidenceResult(confidence="high", note="")

    params: list = [region]
    month_filter = ""
    if year_month:
        month_filter = " AND year_month = %s"
        params.append(year_month)

    rows = await fetch_all(
        f"SELECT float_count, qc_pass_ratio, excluded_readings "
        f"FROM qc_stats WHERE region = %s{month_filter} ORDER BY year_month DESC LIMIT 1",
        tuple(params),
    )

    if not rows:
        # No precomputed stats — fall back to live float density probe.
        density = await fetch_all(
            "SELECT COUNT(DISTINCT float_id) AS fc FROM argo_profiles WHERE region = %s",
            (region,),
        )
        fc = (density[0].get("fc") or 0) if density else 0
        if fc < settings.min_float_count:
            return ConfidenceResult(
                confidence="low",
                note="Limited float coverage.",
                float_count=fc,
            )
        return ConfidenceResult(confidence="high", note="", float_count=fc)

    row = rows[0]
    fc = row.get("float_count")
    ratio = row.get("qc_pass_ratio")
    excluded = row.get("excluded_readings") or 0
    reasons: list[str] = []

    if fc is not None and fc < settings.min_float_count:
        reasons.append("limited float coverage")
    if ratio is not None and ratio < settings.min_qc_pass_ratio:
        reasons.append("a high proportion of readings failed quality checks")

    if reasons:
        note = " and ".join(reasons) + "."
        return ConfidenceResult(
            confidence="low", note=note, float_count=fc,
            qc_pass_ratio=ratio, qc_excluded_count=excluded,
        )
    return ConfidenceResult(
        confidence="high", note="", float_count=fc,
        qc_pass_ratio=ratio, qc_excluded_count=excluded,
    )