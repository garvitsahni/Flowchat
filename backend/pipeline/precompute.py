"""Precompute summary tables that power cheap query-time lookups.

Fills, per region + calendar month:
  qc_stats               — float/profile density + QC quality (Uncertainty Engine)
  regional_monthly_avg   — mean temp/salinity per 100 m depth bucket (comparison baseline)

Runs as floatchat_owner after ingestion. Deletes and rebuilds from source tables so
re-runs are idempotent. Only valid readings (is_valid = true) feed regional_monthly_avg;
qc_stats keeps the raw excluded count for the explainability panel.

Design doc: docs/superpowers/specs/2026-08-18-floatchat-day1-foundation-design.md §5
"""

from __future__ import annotations

import argparse
import sys

import psycopg

from config import settings

DEPTH_BUCKET_M = 100


def precompute() -> dict:
    with psycopg.connect(settings.pipeline_db_url) as conn:
        with conn.cursor() as cur:
            # --- qc_stats: one row per (region, YYYY-MM) ---
            cur.execute("DELETE FROM qc_stats")
            cur.execute(
                """
                INSERT INTO qc_stats (region, year_month, float_count, profile_count,
                                      total_readings, excluded_readings)
                SELECT p.region,
                       TO_CHAR(p.profile_date, 'YYYY-MM'),
                       COUNT(DISTINCT p.float_id),
                       COUNT(DISTINCT p.profile_id),
                       COUNT(m.measurement_id),
                       COUNT(m.measurement_id) FILTER (WHERE NOT m.is_valid)
                FROM argo_profiles p
                JOIN argo_measurements m ON m.profile_id = p.profile_id
                GROUP BY p.region, TO_CHAR(p.profile_date, 'YYYY-MM')
                """
            )
            qc_rows = cur.rowcount

            # --- regional_monthly_avg: per region, month, 100m depth bucket ---
            cur.execute("DELETE FROM regional_monthly_avg")
            cur.execute(
                f"""
                INSERT INTO regional_monthly_avg (region, year_month, avg_temp_c,
                                                  avg_salinity_psu, depth_bucket_m)
                SELECT p.region,
                       TO_CHAR(p.profile_date, 'YYYY-MM'),
                       AVG(m.temperature_c),
                       AVG(m.salinity_psu),
                       (m.depth_m / {DEPTH_BUCKET_M})::int * {DEPTH_BUCKET_M}
                FROM argo_profiles p
                JOIN argo_measurements m ON m.profile_id = p.profile_id
                WHERE m.is_valid = true
                  AND (m.temperature_c IS NOT NULL OR m.salinity_psu IS NOT NULL)
                GROUP BY p.region, TO_CHAR(p.profile_date, 'YYYY-MM'),
                         (m.depth_m / {DEPTH_BUCKET_M})::int * {DEPTH_BUCKET_M}
                """
            )
            avg_rows = cur.rowcount
            conn.commit()

    return {"qc_stats": qc_rows, "regional_monthly_avg": avg_rows}


def main() -> None:
    parser = argparse.ArgumentParser(description="Precompute qc_stats + regional_monthly_avg.")
    args = parser.parse_args()  # noqa: F841
    try:
        summary = precompute()
    except psycopg.Error as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)
    print("precomputed:", summary)


if __name__ == "__main__":
    main()