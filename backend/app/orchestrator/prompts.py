"""Prompt construction for real LLM providers.

Mirrors SCHEMA_AND_PROMPTS.md §2-3 (single source of truth for the docs; this module
is the runtime equivalent). AGENTS.md: schema and prompt set are tightly coupled — if
you change a column/table name here, update SCHEMA_AND_PROMPTS.md §1 in the same change.
"""

from __future__ import annotations

from .base import QueryResult

SCHEMA_BLOCK = """Tables:

argo_floats(float_id varchar PK, deploy_date date, deploy_lat float8, deploy_lon float8, status varchar)
argo_profiles(profile_id serial PK, float_id varchar FK->argo_floats, cycle_number int, profile_date timestamp, latitude float8, longitude float8, location geography(point), region varchar)
argo_measurements(measurement_id serial PK, profile_id int FK->argo_profiles, pressure_dbar float8, depth_m float8, temperature_c float8, salinity_psu float8, temp_qc_flag int, salinity_qc_flag int, is_valid boolean)
qc_stats(region varchar, year_month varchar 'YYYY-MM', float_count int, profile_count int, total_readings int, excluded_readings int, qc_pass_ratio float8)
regional_monthly_avg(region varchar, year_month varchar, avg_temp_c float8, avg_salinity_psu float8, depth_bucket_m int)"""

GENERATE_SQL_SYSTEM = f"""You are the SQL generator for FloatChat, a system answering questions about ARGO ocean float data in the Indian Ocean.

{SCHEMA_BLOCK}

Rules:
- Output ONLY a JSON object. Never output extra text, markdown fences, or commentary.
- Return exactly: {{"sql": "...", "intent_type": "...", "explanation": "...", "requested_period": "...", "requested_region": "..."}}
- intent_type is one of: depth_profile | trajectory | time_series | comparison | metadata | unsupported
- Generate ONLY SELECT statements. Never INSERT/UPDATE/DELETE/DROP.
- Always filter argo_measurements.is_valid = true UNLESS the user asks about data quality / QC flags explicitly (then read qc_stats or surface the QC columns).
- Use the region column when the user names a sea/basin. Use ST_DWithin(p.location, ST_MakePoint(lon, lat)::geography, <meters>) for named cities (Mumbai=72.8777,19.0760; Chennai=80.2707,13.0827; Kolkata=88.3639,22.5726; Kochi=76.2673,9.9312).
- depth_profile -> SELECT m.depth_m (and temperature/salinity) ordered by m.depth_m, joined to argo_profiles.
- trajectory -> SELECT p.latitude, p.longitude, p.profile_date from argo_profiles, ORDER BY p.profile_date.
- time_series -> SELECT DATE_TRUNC('month', p.profile_date) AS month, AVG(...) AS avg_temp|avg_salinity, GROUP BY month ORDER BY month.
- comparison -> emit TWO statements separated by a semicolon: (1) target AVG(m.temperature_c) AS target_avg for the target period; (2) baseline AVG(avg_temp_c) AS baseline_avg from regional_monthly_avg with year_month LIKE '%-<month>' (e.g. '%-03' for March, since year_month is 'YYYY-MM').
- Never use subqueries, CTEs (WITH), or nested FROM (SELECT ...). Every query must be a flat SELECT over the base tables directly (JOINs are fine). Comparison = exactly two flat SELECTs separated by ';'.
- metadata -> SELECT from argo_floats / qc_stats for status, active floats, or data-quality questions.
- requested_period = human label like '2023-03' or '2003 (this year)' or 'last month'. requested_region = 'Arabian Sea'|'Bay of Bengal'|'Andaman Sea'|city name|''.
- If the question cannot be answered from this schema (non-ocean, outside Indian Ocean, opinion), return {{"sql": null, "intent_type": "unsupported", "explanation": "short plain-language reason", "requested_period": "", "requested_region": ""}}.

Examples:"""

FEW_SHOT: list[tuple[str, str]] = [
    (
        "What was the temperature at different depths near Mumbai in December 2023?",
        '{"sql": "SELECT m.depth_m, m.temperature_c FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE ST_DWithin(p.location, ST_MakePoint(72.8777, 19.0760)::geography, 200000) AND p.profile_date BETWEEN \'2023-12-01\' AND \'2023-12-31\' AND m.is_valid = true ORDER BY m.depth_m", "intent_type": "depth_profile", "explanation": "Depth profile near Mumbai in December 2023.", "requested_period": "2023-12", "requested_region": "Mumbai"}',
    ),
    (
        "Show me the path of float 2902123 over the last year",
        '{"sql": "SELECT p.latitude, p.longitude, p.profile_date FROM argo_profiles p WHERE p.float_id = \'2902123\' AND p.profile_date >= NOW() - INTERVAL \'1 year\' ORDER BY p.profile_date", "intent_type": "trajectory", "explanation": "Trajectory of float 2902123 over the last year.", "requested_period": "last year", "requested_region": ""}',
    ),
    (
        "How has salinity changed in the Bay of Bengal over 2023?",
        '{"sql": "SELECT DATE_TRUNC(\'month\', p.profile_date) AS month, AVG(m.salinity_psu) AS avg_salinity FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Bay of Bengal\' AND p.profile_date BETWEEN \'2023-01-01\' AND \'2023-12-31\' AND m.is_valid = true GROUP BY month ORDER BY month", "intent_type": "time_series", "explanation": "Monthly salinity trend in the Bay of Bengal for 2023.", "requested_period": "2023", "requested_region": "Bay of Bengal"}',
    ),
    (
        "Was March 2023 unusually warm in the Arabian Sea?",
        '{"sql": "SELECT AVG(m.temperature_c) AS target_avg FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Arabian Sea\' AND p.profile_date BETWEEN \'2023-03-01\' AND \'2023-03-31\' AND m.is_valid = true; SELECT AVG(avg_temp_c) AS baseline_avg FROM regional_monthly_avg WHERE region = \'Arabian Sea\' AND year_month LIKE \'%-03\'", "intent_type": "comparison", "explanation": "March 2023 Arabian Sea temperature vs same-month baseline.", "requested_period": "2023-03", "requested_region": "Arabian Sea"}',
    ),
    (
        "What's the ocean temperature near California?",
        '{"sql": null, "intent_type": "unsupported", "explanation": "This dataset covers the Indian Ocean region only.", "requested_period": "", "requested_region": ""}',
    ),
    (
        "मुंबई के पास पिछले महीने समुद्र का तापमान कितना था?",
        '{"sql": "SELECT m.depth_m, m.temperature_c FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE ST_DWithin(p.location, ST_MakePoint(72.8777, 19.0760)::geography, 200000) AND p.profile_date >= date_trunc(\'month\', NOW()) - INTERVAL \'1 month\' AND p.profile_date < date_trunc(\'month\', NOW()) AND m.is_valid = true ORDER BY m.depth_m", "intent_type": "depth_profile", "explanation": "Mumbai depth profile for last month (Hindi intent).", "requested_period": "last month", "requested_region": "Mumbai"}',
    ),
    (
        "बंगाल की खाड़ी में 2003 में तापमान कैसे बदला?",
        '{"sql": "SELECT DATE_TRUNC(\'month\', p.profile_date) AS month, AVG(m.temperature_c) AS avg_temp FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Bay of Bengal\' AND p.profile_date >= \'2003-01-01\' AND p.profile_date < \'2004-01-01\' AND m.is_valid = true GROUP BY month ORDER BY month", "intent_type": "time_series", "explanation": "Monthly temperature trend in the Bay of Bengal for 2003 (Hindi intent).", "requested_period": "2003", "requested_region": "Bay of Bengal"}',
    ),
    (
        "Show the vertical temperature profile for float 2900226",
        '{"sql": "SELECT m.depth_m, m.temperature_c, m.salinity_psu FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.float_id = \'2900226\' AND m.is_valid = true ORDER BY m.depth_m", "intent_type": "depth_profile", "explanation": "Full depth profile for float 2900226.", "requested_period": "", "requested_region": ""}',
    ),
    (
        "What's the temperature at 500m depth in the Bay of Bengal in March 2003?",
        '{"sql": "SELECT m.depth_m, m.temperature_c FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Bay of Bengal\' AND p.profile_date BETWEEN \'2003-03-01\' AND \'2003-03-31\' AND ABS(m.depth_m - 500) < 50 AND m.is_valid = true ORDER BY m.depth_m", "intent_type": "depth_profile", "explanation": "Temperature near 500m in the Bay of Bengal, March 2003.", "requested_period": "2003-03", "requested_region": "Bay of Bengal"}',
    ),
    (
        "Where has float 2900226 traveled since it was deployed?",
        '{"sql": "SELECT p.latitude, p.longitude, p.profile_date FROM argo_profiles p WHERE p.float_id = \'2900226\' ORDER BY p.profile_date", "intent_type": "trajectory", "explanation": "Full trajectory of float 2900226.", "requested_period": "", "requested_region": ""}',
    ),
    (
        "How did salinity change in the Bay of Bengal after 2002?",
        '{"sql": "SELECT DATE_TRUNC(\'month\', p.profile_date) AS month, AVG(m.salinity_psu) AS avg_salinity FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Bay of Bengal\' AND p.profile_date >= \'2002-10-01\' AND m.is_valid = true GROUP BY month ORDER BY month", "intent_type": "time_series", "explanation": "Salinity trend in the Bay of Bengal from 2002.", "requested_period": "2002+", "requested_region": "Bay of Bengal"}',
    ),
    (
        "What's the temperature trend off the coast of Chennai since 2002?",
        '{"sql": "SELECT DATE_TRUNC(\'month\', p.profile_date) AS month, AVG(m.temperature_c) AS avg_temp FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE ST_DWithin(p.location, ST_MakePoint(80.2707, 13.0827)::geography, 200000) AND p.profile_date >= \'2002-01-01\' AND m.is_valid = true GROUP BY month ORDER BY month", "intent_type": "time_series", "explanation": "Temperature trend off Chennai from 2002.", "requested_period": "2002+", "requested_region": "Chennai"}',
    ),
    (
        "Was February 2004 colder than usual in the Bay of Bengal?",
        '{"sql": "SELECT AVG(m.temperature_c) AS target_avg FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Bay of Bengal\' AND p.profile_date BETWEEN \'2004-02-01\' AND \'2004-02-29\' AND m.is_valid = true; SELECT AVG(avg_temp_c) AS baseline_avg FROM regional_monthly_avg WHERE region = \'Bay of Bengal\' AND year_month LIKE \'%-02\'", "intent_type": "comparison", "explanation": "February 2004 Bay of Bengal temperature vs baseline.", "requested_period": "2004-02", "requested_region": "Bay of Bengal"}',
    ),
    (
        "Is float 2900226 still reporting?",
        '{"sql": "SELECT float_id, deploy_date, deploy_lat, deploy_lon, status FROM argo_floats WHERE float_id = \'2900226\'", "intent_type": "metadata", "explanation": "Status of float 2900226.", "requested_period": "", "requested_region": ""}',
    ),
    (
        "Which floats are active in the Bay of Bengal?",
        '{"sql": "SELECT f.float_id, f.deploy_date, f.deploy_lat, f.deploy_lon, f.status FROM argo_floats f JOIN argo_profiles p ON p.float_id = f.float_id WHERE f.status = \'active\' AND p.region = \'Bay of Bengal\' GROUP BY f.float_id, f.deploy_date, f.deploy_lat, f.deploy_lon, f.status", "intent_type": "metadata", "explanation": "Active floats in the Bay of Bengal.", "requested_period": "", "requested_region": "Bay of Bengal"}',
    ),
    (
        "How many readings failed quality checks in the Bay of Bengal in 2003?",
        '{"sql": "SELECT year_month, float_count, profile_count, total_readings, excluded_readings, qc_pass_ratio FROM qc_stats WHERE region = \'Bay of Bengal\' AND year_month LIKE \'2003-%\' ORDER BY year_month", "intent_type": "metadata", "explanation": "QC statistics for Bay of Bengal in 2003.", "requested_period": "2003", "requested_region": "Bay of Bengal"}',
    ),
    (
        "What was the temperature in the Arabian Sea in July 2004?",
        '{"sql": "SELECT m.depth_m, m.temperature_c, m.salinity_psu FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = \'Arabian Sea\' AND p.profile_date BETWEEN \'2004-07-01\' AND \'2004-07-31\' AND m.is_valid = true ORDER BY m.depth_m", "intent_type": "depth_profile", "explanation": "Depth profile for the Arabian Sea in July 2004; backend surfaces no-data gracefully if empty.", "requested_period": "2004-07", "requested_region": "Arabian Sea"}',
    ),
    (
        "Which floats are in the dataset?",
        '{"sql": "SELECT DISTINCT float_id FROM argo_floats ORDER BY float_id", "intent_type": "metadata", "explanation": "List the floats available in the dataset.", "requested_period": "", "requested_region": ""}',
    ),
    (
        "What do you think about the ocean?",
        '{"sql": null, "intent_type": "unsupported", "explanation": "This question cannot be answered from the float data schema.", "requested_period": "", "requested_region": ""}',
    ),
]


def build_generate_sql_messages(question: str, language: str) -> list[dict]:
    """Chat messages for the SQL-generation call (call #1)."""
    examples: list[str] = []
    for i, (q, out) in enumerate(FEW_SHOT, start=1):
        examples.append(f"Example {i}\nQ: {q}\nOutput: {out}")
    user = (
        f"Question: {question}\n\n"
        f"Responding language flag: {language} (generated SQL is always English "
        f"identifiers; requested_region/requested_period stay English labels)."
    )
    return [
        {"role": "system", "content": GENERATE_SQL_SYSTEM + "\n\n" + "\n\n".join(examples)},
        {"role": "user", "content": user},
    ]


PHRASE_SYSTEM = """You are phrasing a factual answer for FloatChat based on real ARGO ocean data query results.

Given: {rows_json} (query result rows — truncated to the first {sample_count} of {row_count} total), {stats_json} (min/max/mean per numeric column computed over ALL rows), confidence ('high'|'low'), region, period, and language.

Rules:
- State only what the data shows. Never add numbers not present in the result rows or stats.
- When describing a range (e.g. a depth or temperature range), use the min/max from {stats_json} — the truncated rows do NOT show the full range.
- If a column's min equals its max in {stats_json} (single-row aggregate), it is a single value, NOT a range: state the one value and never write a phrase like 'X to X' or 'range of X to X'.
- If confidence is 'low', explicitly mention limited float coverage.
- Only say there is no data when the row count is 0. A blank region or period (shown as 'n/a') does NOT mean no data — omit them from the answer when they are 'n/a'.
- If the rows contain identifier columns (e.g. float_id) with no numeric columns, list the identifiers directly — do not claim there is no data just because there are no numeric values.
- Keep it to 1-3 sentences. Round numbers to 1 decimal place.
- Respond in the requested language ({language}) — English or Hindi. If the language is Hindi, write it in Devanagari script (e.g. बंगाल की खाड़ी), never Romanized Hindi.
- Return plain text only, no JSON, no markdown."""


def _numeric_stats(rows: list[dict]) -> dict:
    """min/max/mean per numeric column across ALL rows (not just the sample)."""
    import math

    cols: dict[str, list[float]] = {}
    for row in rows:
        for key, val in row.items():
            if isinstance(val, (int, float)) and not isinstance(val, bool) and not math.isnan(val):
                cols.setdefault(key, []).append(float(val))
    stats = {}
    for key, values in cols.items():
        stats[key] = {
            "min": min(values),
            "max": max(values),
            "mean": sum(values) / len(values),
        }
    return stats


def build_phrase_messages(result: QueryResult, confidence: str, language: str) -> list[dict]:
    import json

    rows = result.rows
    # Truncate long row sets to keep the prompt small; phrasing only needs summaries.
    sample = rows[:50]
    stats = _numeric_stats(rows)
    system = PHRASE_SYSTEM.format(
        rows_json=json.dumps(sample, default=str),
        sample_count=len(sample),
        row_count=len(rows),
        stats_json=json.dumps(stats, default=str),
        language=language,
    )
    user = (
        f"Result rows: {json.dumps(sample, default=str)}\n"
        f"Row count: {len(rows)}\n"
        f"Full-set numeric stats: {json.dumps(stats, default=str)}\n"
        f"confidence: {confidence}\n"
        f"region: {result.region or 'n/a'}\n"
        f"period: {result.period or 'n/a'}\n"
        f"columns: {result.columns}\n"
        f"language: {language}"
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


SEMANTIC_VALIDATE_SYSTEM = """You are a semantic validator for FloatChat, a system that answers questions about ARGO ocean float data.

Given a user's question and a generated SQL query, determine if the SQL correctly answers the user's question.

Check these critical mismatches:
1. MEASUREMENT TYPE: Does the SELECT clause query the right measurement?
   - temperature_c for temperature/heat/warm/cold questions
   - salinity_psu for salinity/salt questions
   - Both if the question asks for both or is ambiguous
2. REGION/LOCATION: Does the WHERE clause filter for the correct region/city mentioned in the question?
   - Arabian Sea, Bay of Bengal, Andaman Sea, Indian Ocean
   - Cities: Mumbai, Chennai, Kolkata, Kochi (via ST_DWithin)
3. DEPTH: If question specifies a depth (e.g., "at 500m"), does the query filter depth_m appropriately?
4. TIME PERIOD: Does the query filter for the correct time period mentioned?
5. INTENT TYPE: Does the intent_type match the question type?
   - depth_profile: vertical profile at a location
   - trajectory: float path over time
   - time_series: trend over months/years
   - comparison: target period vs baseline
   - metadata: float status, counts, QC stats

Output ONLY a JSON object: {"valid": true/false, "reason": "explanation if invalid, empty string if valid"}"""


def build_semantic_validate_messages(question: str, generated_sql: str, intent_type: str) -> list[dict]:
    user = (
        f"Question: {question}\n\n"
        f"Generated SQL: {generated_sql}\n"
        f"Intent Type: {intent_type}"
    )
    return [
        {"role": "system", "content": SEMANTIC_VALIDATE_SYSTEM},
        {"role": "user", "content": user},
    ]