"""Ingest real ARGO NetCDF files into Postgres (QC filtering at load).

Reads the three core files for one float (prof / meta / Rtraj) and writes:
  argo_floats        <- meta (id, deploy date/lat/lon, status)
  argo_profiles      <- prof cycles (date, lat, lon, PostGIS point, region)
  argo_measurements  <- per-depth temp/salinity + QC flags

QC handling (ARCHITECTURE.md §2.1): QC flags are stored as-is; the generated
`is_valid` column (flag IN (1,2)) excludes bad readings from default queries
without deleting them. Region labels are assigned here by bounding box —
never by the LLM. Runs as floatchat_owner (pipeline role), not the read-only app role.

Design doc: docs/superpowers/specs/2026-08-18-floatchat-day1-foundation-design.md §5
"""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg
import xarray as xr

from config import settings

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data" / "netcdf"

# Region bounding boxes (Indian Ocean subset, PHASES.md). Assign at ingest, never by LLM.
REGION_BOXES: list[tuple[str, float, float, float, float]] = [
    ("Arabian Sea", 5.0, 25.0, 40.0, 78.0),
    ("Bay of Bengal", 5.0, 25.0, 78.0, 95.0),
    ("Andaman Sea", 4.0, 16.0, 90.0, 100.0),
]


def region_for(lat: float, lon: float) -> str:
    """Label a position by the first matching bounding box, else 'other'."""
    for name, lat_min, lat_max, lon_min, lon_max in REGION_BOXES:
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return name
    return "other"


def _parse_launch(raw) -> datetime | None:
    """meta LAUNCH_DATE is 'YYYYMMDDHHMMSS'. Return datetime or None."""
    try:
        s = raw.item().decode("ascii").strip()
        if len(s) < 8:
            return None
        return datetime.strptime(s[:8], "%Y%m%d")
    except (ValueError, TypeError, AttributeError):
        return None


def _as_float(v) -> float | None:
    """None for NaN / masked values."""
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if np.isnan(f) else f


def _qc_flag(v) -> int | None:
    """Argo QC is a single-char code ('1'..'9'); store int, None when missing."""
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    try:
        s = bytes(v).decode("ascii").strip()
    except (TypeError, ValueError):
        s = str(v).strip()
    if not s or s in ("nan", "9"):
        return None
    try:
        return int(s)
    except ValueError:
        return None


def ingest_float(float_id: str, dac: str = "incois", clean: bool = False) -> dict:
    """Ingest one float's NetCDF files. Returns a summary dict."""
    fdir = DATA_DIR / float_id
    prof_file = fdir / f"{float_id}_prof.nc"
    meta_file = fdir / f"{float_id}_meta.nc"

    if not prof_file.exists() or not meta_file.exists():
        raise FileNotFoundError(
            f"Missing NetCDF files for {float_id} in {fdir}. Run download.py first."
        )

    if clean:
        with psycopg.connect(settings.pipeline_db_url) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM argo_measurements WHERE profile_id IN "
                    "(SELECT profile_id FROM argo_profiles WHERE float_id = %s)",
                    (float_id,),
                )
                cur.execute("DELETE FROM argo_profiles WHERE float_id = %s", (float_id,))
                cur.execute("DELETE FROM argo_floats WHERE float_id = %s", (float_id,))
            conn.commit()

    with xr.open_dataset(prof_file) as prof, xr.open_dataset(meta_file) as meta:
        platform = bytes(prof["PLATFORM_NUMBER"].values[0]).decode("ascii").strip()
        if platform != float_id:
            print(f"warning: file float_id {platform} != requested {float_id}", file=sys.stderr)

        cycles = prof["CYCLE_NUMBER"].values
        juld = prof["JULD"].values
        lats = prof["LATITUDE"].values
        lons = prof["LONGITUDE"].values
        pres = prof["PRES"].values
        temp = prof["TEMP"].values
        sal = prof["PSAL"].values
        temp_qc = prof["TEMP_QC"].values
        sal_qc = prof["PSAL_QC"].values

        # --- argo_floats from meta ---
        launch = _parse_launch(meta["LAUNCH_DATE"].values)
        deploy_lat = _as_float(meta["LAUNCH_LATITUDE"].values)
        deploy_lon = _as_float(meta["LAUNCH_LONGITUDE"].values)

        # status: derived from last profile date (float stopped reporting)
        last_date = juld[~np.isnat(juld)].max() if juld.size else None
        status = "active"
        if last_date is not None:
            dt = pd.Timestamp(last_date).to_pydatetime()
            if datetime.now() - dt.replace(tzinfo=None) > timedelta(days=365):
                status = "inactive"

    profile_count = 0
    measurement_count = 0
    excluded_count = 0

    with psycopg.connect(settings.pipeline_db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO argo_floats (float_id, deploy_date, deploy_lat, deploy_lon, status)
                   VALUES (%s, %s, %s, %s, %s)
                   ON CONFLICT (float_id) DO UPDATE SET
                     deploy_date = EXCLUDED.deploy_date,
                     deploy_lat = EXCLUDED.deploy_lat,
                     deploy_lon = EXCLUDED.deploy_lon,
                     status = EXCLUDED.status""",
                (float_id, launch, deploy_lat, deploy_lon, status),
            )

            for i in range(len(cycles)):
                lat = _as_float(lats[i])
                lon = _as_float(lons[i])
                when = pd.Timestamp(juld[i]).to_pydatetime() if not np.isnat(juld[i]) else None
                if lat is None or lon is None or when is None:
                    continue
                cycle = cycles[i]
                region = region_for(lat, lon)

                cur.execute(
                    """INSERT INTO argo_profiles
                       (float_id, cycle_number, profile_date, latitude, longitude, location, region)
                       VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s)
                       ON CONFLICT DO NOTHING
                       RETURNING profile_id""",
                    (float_id, int(cycle), when, lat, lon, lon, lat, region),
                )
                row = cur.fetchone()
                if row is None:
                    # profile already exists — resolve its id for measurements
                    cur.execute(
                        "SELECT profile_id FROM argo_profiles WHERE float_id=%s AND cycle_number=%s",
                        (float_id, int(cycle)),
                    )
                    row = cur.fetchone()
                    if row is None:
                        continue
                profile_id = row[0]
                profile_count += 1

                for k in range(pres.shape[1]):
                    pval = _as_float(pres[i, k])
                    tval = _as_float(temp[i, k])
                    sval = _as_float(sal[i, k])
                    if pval is None:
                        continue  # empty level
                    if tval is None and sval is None:
                        continue  # pressure exists but no values
                    depth = round(pval * 1.02, 1)  # dbar -> metres approx
                    cur.execute(
                        """INSERT INTO argo_measurements
                           (profile_id, pressure_dbar, depth_m, temperature_c, salinity_psu,
                            temp_qc_flag, salinity_qc_flag)
                           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                        (
                            profile_id, pval, depth, tval, sval,
                            _qc_flag(temp_qc[i, k]), _qc_flag(sal_qc[i, k]),
                        ),
                    )
                    measurement_count += 1

            # excluded = inserted rows where the generated is_valid column is false
            cur.execute(
                """SELECT COUNT(*) FROM argo_measurements m
                   JOIN argo_profiles p ON m.profile_id = p.profile_id
                   WHERE p.float_id = %s AND NOT m.is_valid""",
                (float_id,),
            )
            excluded_count = cur.fetchone()[0]
            conn.commit()

    return {
        "float_id": float_id,
        "profiles": profile_count,
        "measurements": measurement_count,
        "excluded": excluded_count,
        "status": status,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest ARGO NetCDF files into Postgres.")
    parser.add_argument("float_id", help="WMO float ID, e.g. 2900226")
    parser.add_argument("--dac", default="incois")
    parser.add_argument("--clean", action="store_true", help="Re-ingest: delete this float first")
    args = parser.parse_args()

    try:
        summary = ingest_float(args.float_id, dac=args.dac, clean=args.clean)
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("ingested:", summary)


if __name__ == "__main__":
    main()
