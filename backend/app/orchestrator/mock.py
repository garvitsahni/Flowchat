"""Deterministic mock NL→SQL resolver.

Serves as the default LLM provider until real API keys land. Implements the core intents
from SCHEMA_AND_PROMPTS.md §2 with real SQL matching the few-shot patterns, so the full
pipeline (guardrail → read-only execute → uncertainty → answer) works against real data.

Marked MOCK by design (AGENTS.md: mock is fine for early scaffolding but must match the
real contract exactly — it does, and it executes against the real schema).
"""

from __future__ import annotations

import re
from datetime import datetime

from .base import GeneratedSQL, QueryResult, LLMProvider

WMO_ID_RE = re.compile(r"\b\d{7}\b")
DEPTH_RE = re.compile(r"\b(\d{2,4})\s*(?:m|meters|metres|mtr)\b", re.IGNORECASE)
MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}

CITY_ANCHORS: dict[str, tuple[float, float, int]] = {
    # name -> (lat, lon, radius_meters)
    "mumbai": (19.0760, 72.8777, 200_000),
    "chennai": (13.0827, 80.2707, 200_000),
    "kolkata": (22.5726, 88.3639, 200_000),
    "kochi": (9.9312, 76.2673, 150_000),
}

OUT_OF_SCOPE = [
    "california", "pacific", "atlantic", "atlantic ocean", "atlantic",
    "mediterranean", "north sea", "caribbean", "greenland", "japan", "tokyo",
    "mexico", "brazil", "australia", "new zealand", "chile", "peru", "africa",
    "europe", "usa", "america", "united states", "england", "france", "spain",
]

# Parameters the schema does NOT support — question asks for these → graceful refusal.
UNSUPPORTED_PARAMS = [
    "oxygen", "dissolved oxygen", "do level", "ph ", "ph level",
    "nitrate", "phosphate", "chlorophyll", "silicate", "current",
    "wave", "tide", "wind", "precipitation", "rainfall",
]


class MockProvider:
    """Deterministic rule-based provider. Name kept snake_case-able for settings."""

    name = "mock"

    # ------------------------------------------------------------------ public

    def generate_sql(self, question: str, language: str = "en") -> GeneratedSQL:
        q = question.lower()

        if self._is_out_of_scope(q):
            return GeneratedSQL(
                sql=None,
                intent_type="unsupported",
                language=language,
                explanation="This dataset covers the Indian Ocean region only.",
            )

        # Check if the question asks for a parameter not in our schema
        unsupported_param = self._asks_unsupported_param(q)
        if unsupported_param:
            return GeneratedSQL(
                sql=None,
                intent_type="unsupported",
                language=language,
                explanation=(
                    f"The ARGO float dataset does not include {unsupported_param} data. "
                    f"Available measurements are temperature and salinity."
                ),
            )

        float_id = self._extract_float_id(question)

        if float_id and self._is_trajectory(q):
            return self._trajectory(float_id, language)
        if self._is_comparison(q):
            return self._comparison(q, language)
        if float_id:
            return self._float_profile(q, float_id, language)
        if self._is_metadata(q):
            return self._metadata_query(q, language)
        if self._is_depth_profile(q):
            return self._depth_profile(q, language)
        if self._is_heatmap(q):
            return self._heatmap(q, language)
        if self._is_time_series(q):
            return self._time_series(q, language)

        # Context-aware default: if a year/period is mentioned, treat as time_series;
        # if only a region, treat as depth_profile.
        _, period_label = self._period_from(q)
        region, _ = self._extract_region(q)
        if period_label:
            return self._time_series(q, language)
        if region:
            return self._depth_profile(q, language)

        # Truly unrecognized — return a helpful message instead of a blind query
        return GeneratedSQL(
            sql=None,
            intent_type="unsupported",
            language=language,
            explanation=(
                "I couldn't determine what data you're looking for. "
                "Try asking about temperature or salinity in a specific region "
                "(e.g., Bay of Bengal, Arabian Sea) and time period."
            ),
        )

    def phrase_answer(self, result: QueryResult, confidence: str, language: str = "en") -> str:
        """Deterministic phrasing pass (1 decimal, no invented numbers)."""
        rows = result.rows
        if not rows:
            return "No data available for this region and time period."

        if result.columns == ["depth_m", "temperature_c"] or (
            rows and "depth_m" in rows[0] and "temperature_c" in rows[0]
        ):
            return self._phrase_depth_profile(rows, result, confidence)
        if rows and "latitude" in rows[0] and "longitude" in rows[0]:
            return self._phrase_trajectory(rows, result)
        if rows and "month" in rows[0] and "depth_bin" in rows[0]:
            return self._phrase_heatmap(rows, result, confidence)
        if rows and "month" in rows[0]:
            return self._phrase_time_series(rows, result, confidence)
        if rows and ("target_avg" in rows[0] or "avg_temp_c" in rows[0]):
            return self._phrase_comparison(rows, result, confidence)
        return "The query returned the requested data; see the visualization."

    def semantic_validate(self, question: str, generated: GeneratedSQL) -> tuple[bool, str]:
        """Mock always passes semantic validation - it's deterministic by design."""
        if generated.sql is None or generated.intent_type == "unsupported":
            return True, ""
        return True, ""

    # ------------------------------------------------------------- intent tests

    def _is_out_of_scope(self, q: str) -> bool:
        ql = q.lower()
        return any(t in ql for t in OUT_OF_SCOPE)

    def _asks_unsupported_param(self, q: str) -> str | None:
        """Return the unsupported parameter name if the question asks for one."""
        ql = q.lower()
        for param in UNSUPPORTED_PARAMS:
            if param in ql:
                return param.strip()
        return None

    def _is_trajectory(self, q: str) -> bool:
        ql = q.lower()
        return any(t in ql for t in [
            "trajectory", "path", "track", "route", "travel", "moved",
            "where did", "where has", "traveled", "travelled",
        ])

    def _is_comparison(self, q: str) -> bool:
        ql = q.lower()
        return any(
            t in ql
            for t in [
                "compare", "comparison", "vs", "versus", "unusually", "warmer than",
                "colder than", "anomaly", "anomalous", "normal",
                "saline", "salinity compare",
                "hotter than", "cooler than", "higher than", "lower than",
            ]
        )

    def _is_depth_profile(self, q: str) -> bool:
        ql = q.lower()
        return any(
            t in ql
            for t in [
                "depth", "profile", "at 500", "at 100", "temperature at", "salinity at",
                "different depths", "vertical", "surface", "thermocline",
            ]
        ) or bool(DEPTH_RE.search(q))

    def _is_time_series(self, q: str) -> bool:
        ql = q.lower()
        return any(
            t in ql
            for t in [
                "time series", "trend", "over", "how has", "how did", "since",
                "during", "changed", "changes", "monthly", "weekly",
                "over time", "year", "across years", "seasonal", "variation",
                "increase", "decrease", "risen", "fallen",
                "average", "avg", "mean",  # implicit time aggregation
            ]
        ) and not self._is_heatmap(q)

    def _is_heatmap(self, q: str) -> bool:
        ql = q.lower()
        return any(t in ql for t in ["heatmap", "heat map"])

    def _is_metadata(self, q: str) -> bool:
        ql = q.lower()
        return any(
            t in ql
            for t in [
                "active float", "how many float", "which float", "list float",
                "float status", "deployed", "still reporting", "data quality",
                "qc", "quality check", "how many readings",
            ]
        )

    # ---------------------------------------------------------------- entities

    def _extract_float_id(self, question: str) -> str | None:
        m = WMO_ID_RE.search(question)
        return m.group(0) if m else None

    def _extract_region(self, q: str) -> tuple[str, bool]:
        """Return (region_label_or_city_key, is_city). City → ST_DWithin anchor."""
        if "arabian sea" in q or "arabian" in q:
            return "Arabian Sea", False
        if (
            "bengal" in q
            or "bay of bangla" in q
            or "bangla" in q
            or "bangal" in q
            or "बंगाल" in q
        ):
            return "Bay of Bengal", False
        if "andaman" in q:
            return "Andaman Sea", False
        if "indian ocean" in q:
            return "", False  # no region filter = whole dataset
        for city, (lat, lon, radius) in CITY_ANCHORS.items():
            if city in q:
                return city, True
        return "", False

    def _extract_period(self, q: str) -> tuple[str, str]:
        """Return (period_label, sql_date_filter). Empty filter means unbounded."""
        now = datetime.now()

        if "last year" in q:
            year = now.year - 1
            return f"{year} (last year)", (
                f"p.profile_date >= '{year}-01-01' AND p.profile_date < '{year+1}-01-01'"
            )
        if "last month" in q:
            y, m = (now.year, now.month - 1) if now.month > 1 else (now.year - 1, 12)
            label = f"{y}-{m:02d} (last month)"
            return label, self._month_sql(y, m)
        if "this year" in q or "this year so far" in q:
            return f"{now.year} (this year)", (
                f"p.profile_date >= '{now.year}-01-01' AND p.profile_date < '{now.year+1}-01-01'"
            )

        for month_name, mm in MONTH_MAP.items():
            pat = re.compile(rf"{month_name}\s+(\d{{4}})", re.IGNORECASE)
            m = pat.search(q)
            if m:
                year = int(m.group(1))
                label = f"{year}-{mm}"
                return label, self._month_sql(year, int(mm))

        pat_year = re.compile(r"\b(19|20)\d{2}\b")
        m = pat_year.search(q)
        if m:
            year = int(m.group(0))
            return f"{year}", (
                f"p.profile_date >= '{year}-01-01' AND p.profile_date < '{year+1}-01-01'"
            )
        return "", ""

    def _month_sql(self, year: int, month: int) -> str:
        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year + 1, 1, 1)
        else:
            end = datetime(year, month + 1, 1)
        return f"p.profile_date >= '{start:%Y-%m-%d}' AND p.profile_date < '{end:%Y-%m-%d}'"

    # ------------------------------------------------------------ SQL builders

    def _where(self, region: str, is_city: bool, period_filter: str, extra: str = "") -> str:
        parts = []
        if is_city and region in CITY_ANCHORS:
            lat, lon, radius = CITY_ANCHORS[region]
            parts.append(
                f"ST_DWithin(p.location, ST_MakePoint({lon}, {lat})::geography, {radius})"
            )
        elif region:
            parts.append(f"p.region = '{region}'")
        if period_filter:
            parts.append(period_filter)
        if extra:
            parts.append(extra)
        return " AND ".join(parts)

    def _trajectory(self, float_id: str, language: str) -> GeneratedSQL:
        sql = f"""
SELECT p.latitude, p.longitude, p.profile_date
FROM argo_profiles p
WHERE p.float_id = '{float_id}'
ORDER BY p.profile_date"""
        return GeneratedSQL(
            sql=sql,
            intent_type="trajectory",
            language=language,
            explanation=f"Trajectory of float {float_id}.",
        )

    def _float_profile(self, q: str, float_id: str, language: str) -> GeneratedSQL:
        period_filter, label = self._period_from(q)
        where = self._where("", False, period_filter)
        sql = f"""
SELECT m.depth_m, m.temperature_c, m.salinity_psu
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE p.float_id = '{float_id}'{f' AND {where}' if where else ''}
  AND m.is_valid = true
ORDER BY m.depth_m"""
        return GeneratedSQL(
            sql=sql,
            intent_type="depth_profile",
            language=language,
            explanation=f"Profile of float {float_id}.",
            requested_period=label,
        )

    def _depth_profile(self, q: str, language: str) -> GeneratedSQL:
        region, is_city = self._extract_region(q)
        period_filter, label = self._period_from(q)
        depth_filter = ""
        m = DEPTH_RE.search(q)
        if m:
            depth = int(m.group(1))
            depth_filter = (
                f"ABS(m.depth_m - {depth}) < 50"  # nearest bin ±50m
            )
        param = self._detect_parameter(q)
        where = self._where(region, is_city, period_filter, extra=depth_filter)
        if not where:
            where = "m.is_valid = true"
        else:
            where = f"{where}\n  AND m.is_valid = true"
        sql = f"""
SELECT m.depth_m, m.temperature_c, m.salinity_psu
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE {where}
ORDER BY m.depth_m"""
        param_label = "salinity" if param == "m.salinity_psu" else "temperature"
        return GeneratedSQL(
            sql=sql,
            intent_type="depth_profile",
            language=language,
            explanation=f"{param_label.capitalize()} depth profile near '{region or 'Indian Ocean'}'.{' Depth ~' + str(m.group(1)) + 'm.' if m else ''}",
            requested_period=label,
            requested_region=region,
        )

    def _time_series(self, q: str, language: str) -> GeneratedSQL:
        region, is_city = self._extract_region(q)
        period_filter, label = self._period_from(q)
        param = self._detect_parameter(q)
        alias = "avg_salinity" if "salinity" in param else "avg_temp"
        where = self._where(region, is_city, period_filter)
        if not where:
            where = "m.is_valid = true"
        else:
            where = f"{where}\n  AND m.is_valid = true"
        sql = f"""
SELECT DATE_TRUNC('month', p.profile_date) AS month, AVG({param}) AS {alias}
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE {where}
GROUP BY month
ORDER BY month"""
        param_label = "salinity" if "salinity" in param else "temperature"
        return GeneratedSQL(
            sql=sql,
            intent_type="time_series",
            language=language,
            explanation=f"{param_label.capitalize()} time series for '{region or 'Indian Ocean'}'.",
            requested_period=label,
            requested_region=region,
        )

    def _heatmap(self, q: str, language: str) -> GeneratedSQL:
        region, is_city = self._extract_region(q)
        period_filter, label = self._period_from(q)
        param = self._detect_parameter(q)
        alias = "avg_salinity" if "salinity" in param else "avg_temp"
        where = self._where(region, is_city, period_filter)
        if not where:
            where = "m.is_valid = true"
        else:
            where = f"{where}\n  AND m.is_valid = true"
        sql = f"""
SELECT DATE_TRUNC('month', p.profile_date) AS month,
       FLOOR(m.depth_m / 20) * 20 AS depth_bin,
       AVG({param}) AS {alias}
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE {where}
GROUP BY month, depth_bin
ORDER BY month, depth_bin"""
        param_label = "salinity" if "salinity" in param else "temperature"
        return GeneratedSQL(
            sql=sql,
            intent_type="heatmap",
            language=language,
            explanation=f"Depth vs Time {param_label} heatmap for '{region or 'Indian Ocean'}'.",
            requested_period=label,
            requested_region=region,
        )

    def _comparison(self, q: str, language: str) -> GeneratedSQL:
        region, is_city = self._extract_region(q)
        if is_city or not region:
            region = "Arabian Sea"
        period_filter, label = self._period_from(q)
        # Baseline = same calendar month across years from precomputed table
        month_like = ""
        if label and "-" in label:
            month_like = label.split("-")[1]
        month_filter = ""
        if month_like:
            month_filter = f" AND year_month LIKE '%-{month_like}'"
        sql = f"""
SELECT AVG(m.temperature_c) AS target_avg
FROM argo_measurements m
JOIN argo_profiles p ON m.profile_id = p.profile_id
WHERE {self._where(region, False, period_filter)}
  AND m.is_valid = true;

SELECT AVG(avg_temp_c) AS baseline_avg
FROM regional_monthly_avg
WHERE region = '{region}'{month_filter};"""
        return GeneratedSQL(
            sql=sql,
            intent_type="comparison",
            language=language,
            explanation=f"Comparison vs baseline for '{region}'.",
            requested_period=label,
            requested_region=region,
        )

    def _period_from(self, q: str) -> tuple[str, str]:
        label, filter_sql = self._extract_period(q)
        return filter_sql, label

    def _detect_parameter(self, q: str) -> str:
        """Pick the measurement column based on the question text."""
        if "salinity" in q and "temp" not in q:
            return "m.salinity_psu"
        return "m.temperature_c"

    def _metadata_query(self, q: str, language: str) -> GeneratedSQL:
        """Handle metadata / data-quality questions."""
        region, _ = self._extract_region(q)
        if "quality" in q or "qc" in q or "check" in q:
            region_filter = f" AND region = '{region}'" if region else ""
            _, period_label = self._period_from(q)
            year_filter = ""
            if period_label:
                year_filter = f" AND year_month LIKE '{period_label.split('-')[0] if '-' in period_label else period_label}%'"
            sql = f"""SELECT year_month, float_count, profile_count, total_readings, excluded_readings, qc_pass_ratio
FROM qc_stats
WHERE 1=1{region_filter}{year_filter}
ORDER BY year_month"""
            return GeneratedSQL(
                sql=sql,
                intent_type="metadata",
                language=language,
                explanation=f"QC statistics for {region or 'all regions'}.",
                requested_region=region,
            )
        # Default metadata: list floats
        region_join = ""
        region_where = ""
        if region:
            region_join = " JOIN argo_profiles p ON p.float_id = f.float_id"
            region_where = f" AND p.region = '{region}'"
        sql = f"""SELECT DISTINCT f.float_id, f.deploy_date, f.status
FROM argo_floats f{region_join}
WHERE 1=1{region_where}
ORDER BY f.float_id"""
        return GeneratedSQL(
            sql=sql,
            intent_type="metadata",
            language=language,
            explanation=f"Floats in {region or 'the dataset'}.",
            requested_region=region,
        )

    # -------------------------------------------------------------- phrasing

    def _phrase_depth_profile(self, rows: list[dict], result: QueryResult, confidence: str) -> str:
        valid = [r for r in rows if r.get("temperature_c") is not None]
        if not valid:
            return "No data available for this region and time period."
        temps = [r["temperature_c"] for r in valid]
        min_t, max_t = min(temps), max(temps)
        region = result.region or "this region"
        note = f" Limited float coverage." if confidence == "low" else ""
        return (
            f"Across {len(valid)} depth levels in {region}, temperature ranged from "
            f"{min_t:.1f}°C to {max_t:.1f}°C.{note}"
        )

    def _phrase_trajectory(self, rows: list[dict], result: QueryResult) -> str:
        return (
            f"Float tracked {len(rows)} surface positions from "
            f"{rows[0]['profile_date']} to {rows[-1]['profile_date']}."
        )

    def _phrase_time_series(self, rows: list[dict], result: QueryResult, confidence: str) -> str:
        if not rows:
            return "No data available for this region and time period."
        key = "avg_temp" if "avg_temp" in rows[0] else "avg_salinity"
        label = "temperature" if key == "avg_temp" else "salinity"
        unit = "°C" if key == "avg_temp" else " PSU"
        values = [(str(r["month"])[:7], r[key]) for r in rows if r[key] is not None]
        if not values:
            return "No data available for this region and time period."
        first_m, first_v = values[0]
        last_m, last_v = values[-1]
        delta = last_v - first_v
        trend = "rose" if delta > 0 else ("fell" if delta < 0 else "held steady")
        note = f" Limited float coverage." if confidence == "low" else ""
        return (
            f"{label.capitalize()} in {result.region or 'this region'} {trend} from "
            f"{first_v:.1f}{unit} ({first_m}) to {last_v:.1f}{unit} ({last_m}).{note}"
        )

    def _phrase_comparison(self, rows: list[dict], result: QueryResult, confidence: str) -> str:
        target = next((r.get("target_avg") for r in rows if "target_avg" in r), None)
        baseline = next((r.get("baseline_avg") for r in rows if "baseline_avg" in r), None)
        if target is None or baseline is None:
            return "Insufficient data to compare against a baseline."
        delta = target - baseline
        region = result.region or "this region"
        note = " Confidence is low due to limited float coverage." if confidence == "low" else ""
        if abs(delta) < 0.1:
            return f"{region} was about average ({target:.1f}°C) for this period.{note}"
        direction = "warmer" if delta > 0 else "cooler"
        return (
            f"{region} was {abs(delta):.1f}°C {direction} than the "
            f"historical average for this period ({target:.1f}°C vs {baseline:.1f}°C).{note}"
        )

    def _phrase_heatmap(self, rows: list[dict], result: QueryResult, confidence: str) -> str:
        if not rows:
            return "No data available for this region and time period."
        key = "avg_temp" if "avg_temp" in rows[0] else "avg_salinity"
        label = "temperature" if key == "avg_temp" else "salinity"
        note = f" Limited float coverage." if confidence == "low" else ""
        return f"Heatmap showing {label} variation over depth and time in {result.region or 'this region'}.{note}"


def provider_factory(name: str | None = None) -> LLMProvider:
    """Return the active provider (legacy single-select for backward compat).

    A real provider only activates when BOTH LLM_PROVIDER names it AND its API key is
    present (config keys `*_api_key`). Missing key → deterministic mock, so the app
    never crashes when a key is absent.
    """
    from ..config import settings

    chosen = (name or "").lower()
    if chosen == "gemini" and settings.gemini_api_key:
        from .gemini import GeminiProvider

        return GeminiProvider()
    if chosen == "openrouter" and settings.openrouter_api_key:
        from .openrouter import OpenRouterProvider

        return OpenRouterProvider()
    if chosen == "nvidia" and settings.nvidia_api_key:
        from .nvidia import NvidiaProvider

        return NvidiaProvider()
    if chosen == "groq" and settings.groq_api_key:
        from .groq import GroqProvider

        return GroqProvider()
    return MockProvider()


def provider_chain() -> list[LLMProvider]:
    """Return an ordered list of providers for failover.

    Order honours LLM_PROVIDER as primary, then remaining real providers by
    fixed preference (gemini → openrouter → groq), filtered by key presence.
    MockProvider is always the terminal fallback.
    """
    from ..config import settings

    primary = (settings.llm_provider or "").lower()
    preferred_order = ["gemini", "openrouter", "groq", "nvidia"]
    # Put primary first if it's in the list, preserve order of rest
    ordered = [primary] + [p for p in preferred_order if p != primary] if primary in preferred_order else preferred_order

    chain = []
    for name in ordered:
        if name == "gemini" and settings.gemini_api_key:
            from .gemini import GeminiProvider
            chain.append(GeminiProvider())
        elif name == "openrouter" and settings.openrouter_api_key:
            from .openrouter import OpenRouterProvider
            chain.append(OpenRouterProvider())
        elif name == "groq" and settings.groq_api_key:
            from .groq import GroqProvider
            chain.append(GroqProvider())
        elif name == "nvidia" and settings.nvidia_api_key:
            from .nvidia import NvidiaProvider
            chain.append(NvidiaProvider())

    chain.append(MockProvider())
    return chain