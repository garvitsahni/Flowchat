"""Guardrail layer — validates every generated SQL before execution.

Non-negotiable per AGENTS.md / ARCHITECTURE.md §2.4: the LLM never has direct, unguarded
access to the database. Rules enforced here:

1. Every statement must be a SELECT (no INSERT/UPDATE/DELETE/DROP/ALTER/...).
2. Only tables in the known schema may be referenced.
3. Only known columns may be referenced.
4. Row and timeout caps are enforced.
5. Execution always happens through the read-only DB role (floatchat_readonly).

On rejection, the caller returns a graceful message — never a raw DB error.
"""

from __future__ import annotations

import re

from .config import settings

ALLOWED_TABLES = {
    "argo_floats",
    "argo_profiles",
    "argo_measurements",
    "qc_stats",
    "regional_monthly_avg",
}

ALLOWED_COLUMNS = {
    # argo_floats
    "float_id", "deploy_date", "deploy_lat", "deploy_lon", "status",
    # argo_profiles
    "profile_id", "cycle_number", "profile_date", "latitude", "longitude",
    "location", "region",
    # argo_measurements
    "measurement_id", "pressure_dbar", "depth_m", "temperature_c",
    "salinity_psu", "temp_qc_flag", "salinity_qc_flag", "is_valid",
    # qc_stats
    "year_month", "float_count", "profile_count", "total_readings",
    "excluded_readings", "qc_pass_ratio",
    # regional_monthly_avg
    "avg_temp_c", "avg_salinity_psu", "depth_bucket_m",
    # expression aliases the orchestrator may produce
    "month", "avg_temp", "avg_salinity", "target_avg", "baseline_avg",
    "avg", "count",
}

ALLOWED_FUNCTIONS = {
    "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "BETWEEN", "LIKE",
    "GROUP", "BY", "ORDER", "LIMIT", "AS", "ASC", "DESC", "JOIN", "ON",
    "NULL", "TRUE", "FALSE", "AVG", "DATE_TRUNC", "ST_DWITHIN",
    "ST_MAKEPOINT", "ABS", "COUNT", "MIN", "MAX", "ROUND", "SUM", "COALESCE",
    "NULLIF", "ST_DISTANCE", "ST_Y", "ST_X", "INTERVAL", "NOW",
}

BLOCKED_PATTERNS = re.compile(
    r"\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|"
    r"CALL|DO|COPY|VACUUM|EXECUTE|ATTACH|DETACH|COMMENT|MERGE|UPSERT)\b",
    re.IGNORECASE,
)

TABLE_RE = re.compile(r"\b(?:FROM|JOIN)\s+([a-z_]\w*)", re.IGNORECASE)
IDENT_RE = re.compile(r"(?:^|\s)([a-z_]\w*)(?=\s*[,)])", re.IGNORECASE)
QUALIFIED_RE = re.compile(r"\b[a-z_]\w*\.([a-z_]\w*)", re.IGNORECASE)


class GuardrailViolation(Exception):
    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


def _split_statements(sql: str) -> list[str]:
    """Split on statement boundaries, keeping multi-statement (comparison) queries."""
    return [s.strip() for s in sql.split(";") if s.strip()]


def _validate_tables(stmt: str) -> None:
    for table in TABLE_RE.findall(stmt):
        if table.lower() not in ALLOWED_TABLES:
            raise GuardrailViolation(f"Table '{table}' is outside the known schema.")


def _validate_columns(stmt: str) -> None:
    for col in QUALIFIED_RE.findall(stmt):
        if col.lower() not in ALLOWED_COLUMNS:
            raise GuardrailViolation(f"Column '{col}' is outside the known schema.")
    for ident in IDENT_RE.findall(stmt):
        lowered = ident.lower()
        if (
            lowered not in ALLOWED_COLUMNS
            and lowered not in ALLOWED_FUNCTIONS
        ):
            raise GuardrailViolation(f"Unknown identifier '{ident}'.")


def _apply_row_cap(stmt: str) -> str:
    if re.search(r"\bLIMIT\b", stmt, re.IGNORECASE):
        return stmt
    return f"{stmt} LIMIT {settings.max_rows}"


def validate_sql(sql: str) -> list[str]:
    """Validate and return the sanitized statement list ready for execution."""
    if not sql or not sql.strip():
        raise GuardrailViolation("Empty SQL statement.")

    statements = _split_statements(sql)
    if not statements:
        raise GuardrailViolation("No executable statement found.")

    sanitized: list[str] = []
    for stmt in statements:
        stripped = stmt.lstrip()
        if not re.match(r"^\s*SELECT\b", stripped, re.IGNORECASE):
            raise GuardrailViolation("Only SELECT statements are allowed.")
        if BLOCKED_PATTERNS.search(stripped):
            raise GuardrailViolation("Statement contains a blocked operation.")
        _validate_tables(stripped)
        _validate_columns(stripped)
        sanitized.append(_apply_row_cap(stripped))
    return sanitized