"""Batch-ingest the float manifest into Postgres.

Reads data/float_manifest.csv (float_id,dac,region), downloads + ingests each
float using the existing per-float pipeline functions, then precomputes
qc_stats / regional_monthly_avg once. Per-float failures are isolated and
reported; the run exits non-zero only if every float fails.

Run (from repo root):
    PYTHONPATH=backend/app python backend/pipeline/ingest_many.py [--clean] [--only FLOAT] [--skip-download]
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from download import download_float
from ingest import ingest_float
from precompute import precompute

REPO_ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = REPO_ROOT / "data" / "float_manifest.csv"

VALID_REGIONS = {"Bay of Bengal", "Arabian Sea", "Andaman Sea"}


def load_manifest() -> list[dict[str, str]]:
    """Parse the float manifest into a list of {float_id, dac, region} dicts."""
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"manifest not found: {MANIFEST_PATH}")
    with MANIFEST_PATH.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    for row in rows:
        if row.get("region") not in VALID_REGIONS:
            raise ValueError(f"invalid region in manifest: {row}")
    return rows


def ingest_manifest(
    clean: bool = False,
    only: str | None = None,
    skip_download: bool = False,
) -> dict:
    """Ingest all manifest floats. Returns a run summary."""
    manifest = load_manifest()
    if only:
        manifest = [r for r in manifest if r["float_id"] == only]
        if not manifest:
            raise ValueError(f"float {only!r} not in manifest")

    results: list[dict] = []
    failures: list[tuple[str, str]] = []
    for row in manifest:
        fid = row["float_id"]
        try:
            if not skip_download:
                download_float(fid, dac=row["dac"])
            summary = ingest_float(fid, dac=row["dac"], clean=clean)
            results.append(
                {
                    "float_id": fid,
                    "region": row["region"],
                    "profiles": summary["profiles"],
                    "measurements": summary["measurements"],
                    "excluded": summary["excluded"],
                    "status": summary["status"],
                }
            )
            print(f"[ok] {fid} ({row['region']}): {summary}")
        except Exception as exc:  # isolate per-float failures
            failures.append((fid, str(exc)))
            print(f"[fail] {fid}: {exc}", file=sys.stderr)

    precomputed: dict | None = None
    if results:
        precomputed = precompute()

    return {
        "total": len(manifest),
        "succeeded": len(results),
        "failed": len(failures),
        "failures": failures,
        "precomputed": precomputed,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch-ingest the float manifest.")
    parser.add_argument("--clean", action="store_true", help="Re-ingest: delete each float first")
    parser.add_argument("--only", default=None, help="Ingest only this float_id from the manifest")
    parser.add_argument("--skip-download", action="store_true", help="Assume NetCDF files already exist")
    args = parser.parse_args()

    try:
        summary = ingest_manifest(clean=args.clean, only=args.only, skip_download=args.skip_download)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)

    print("summary:", summary)
    if summary["failed"] == summary["total"]:
        sys.exit(1)


if __name__ == "__main__":
    main()