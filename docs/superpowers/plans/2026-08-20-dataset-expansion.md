# Dataset Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the ARGO dataset from 1 float to 15 floats across Bay of Bengal, Arabian Sea, and Andaman Sea (2018+ coverage) via a checked-in float manifest and a batch ingest driver.

**Architecture:** A new `backend/pipeline/ingest_many.py` batch driver reads `data/float_manifest.csv`, reuses the existing per-float `download_float()` / `ingest_float()` functions unchanged, then runs `precompute()` once. A regenerated `data/floatchat_data.sql` keeps the hosted load path (LOAD_ORDER.md) in sync.

**Tech Stack:** Python 3.13, xarray, netCDF4, psycopg, httpx; Postgres 16 + PostGIS on `localhost:55432`; Ifremer ARGO GDAC as data source.

## Global Constraints

- **Real data only (AGENTS.md):** every float in `float_manifest.csv` must exist on the Ifremer GDAC and its `_meta.nc` must return HTTP 200. No fabricated floats or values.
- **No schema / response-contract / frontend changes** (spec §2, §8). `types.ts` and `REGION_BOXES` stay untouched.
- **QC filtering stays at ingestion** (`is_valid = temp_qc_flag IN (1,2) AND salinity_qc_flag IN (1,2)`). Do not filter QC at query time.
- **Region labels assigned at ingest by bounding box**, never by the LLM.
- **Python: type hints on all function signatures** (AGENTS.md).
- **Verify with raw output** — show real command output, never a self-summary.
- **Commit discipline:** short imperative messages prefixed by area (`data: ...`).

---

### Task 1: Float manifest + batch ingest driver

**Files:**
- Create: `data/float_manifest.csv`
- Create: `backend/pipeline/ingest_many.py`
- Test: `backend/pipeline/test_ingest_many.py`

**Interfaces:**
- Consumes: `backend/pipeline/download.py` → `download_float(float_id: str, dac: str = "incois", force: bool = False) -> list[Path]`; `backend/pipeline/ingest.py` → `ingest_float(float_id: str, dac: str = "incois", clean: bool = False) -> dict`; `backend/pipeline/precompute.py` → `precompute() -> dict`.
- Produces: `data/float_manifest.csv` (columns `float_id,dac,region`); `backend/pipeline/ingest_many.py` with `main()` running download→ingest→precompute per manifest row.

- [ ] **Step 1: Write the failing tests**

Uses stdlib `unittest` (pytest is not installed in `backend/.venv`; do not add it).

```python
"""Tests for ingest_many.py — manifest parsing + driver logic.

Run from repo root with the pipeline import path:
    $env:PYTHONPATH="backend/app"; & "backend\.venv\Scripts\python.exe" backend\pipeline\test_ingest_many.py

The pipeline scripts do `from config import settings`, and `config.py` lives in
backend/app — so backend/app must be on PYTHONPATH (see the import note in the plan).
"""

import unittest
from pathlib import Path

from ingest_many import MANIFEST_PATH, load_manifest

REPO_ROOT = Path(__file__).resolve().parents[2]


class ManifestTests(unittest.TestCase):
    def test_manifest_exists(self):
        self.assertTrue(MANIFEST_PATH.exists(), f"manifest missing at {MANIFEST_PATH}")

    def test_manifest_header_and_columns(self):
        rows = load_manifest()
        self.assertGreaterEqual(len(rows), 15, f"expected >=15 floats, got {len(rows)}")
        for row in rows:
            self.assertEqual(set(row.keys()), {"float_id", "dac", "region"}, row)
            self.assertTrue(row["float_id"], row)
            self.assertTrue(row["dac"], row)
            self.assertIn(row["region"], {"Bay of Bengal", "Arabian Sea", "Andaman Sea"}, row)

    def test_manifest_has_all_regions(self):
        rows = load_manifest()
        regions = {r["region"] for r in rows}
        self.assertLessEqual({"Bay of Bengal", "Arabian Sea", "Andaman Sea"}, regions)

    def test_manifest_no_duplicate_floats(self):
        rows = load_manifest()
        ids = [r["float_id"] for r in rows]
        self.assertEqual(len(ids), len(set(ids)), "duplicate float_id in manifest")


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd C:\Users\Garvi\Desktop\Projects\FloatChat && $env:PYTHONPATH="C:\Users\Garvi\Desktop\Projects\FloatChat\backend\app"; & "C:\Users\Garvi\Desktop\Projects\FloatChat\backend\.venv\Scripts\python.exe" backend\pipeline\test_ingest_many.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'ingest_many'` / `MANIFEST_PATH` undefined.

- [ ] **Step 3: Create the manifest**

Create `data/float_manifest.csv` verbatim:

```csv
float_id,dac,region
2900226,incois,Bay of Bengal
2902264,incois,Bay of Bengal
2902236,incois,Bay of Bengal
2902235,incois,Bay of Bengal
2902775,csio,Bay of Bengal
2902766,csio,Bay of Bengal
6903062,coriolis,Arabian Sea
6903059,coriolis,Arabian Sea
6902946,coriolis,Arabian Sea
6903060,coriolis,Arabian Sea
6903063,coriolis,Arabian Sea
2902702,csio,Andaman Sea
1901442,aoml,Andaman Sea
2902597,csio,Andaman Sea
2902612,csio,Andaman Sea
```

- [ ] **Step 4: Write `backend/pipeline/ingest_many.py`**

```python
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
```

> **Import note:** pipeline scripts import `from config import settings`, and `config.py` lives at `backend/app/config.py`. They must be run with `PYTHONPATH=backend/app` and **as scripts** (not `-m pipeline.*`), e.g. from repo root: `PYTHONPATH=backend/app python backend/pipeline/ingest_many.py`. Running as a script puts `backend/pipeline/` on `sys.path` so `ingest_many.py`'s `from download import ...` / `from ingest import ...` / `from precompute import ...` resolve, while `PYTHONPATH=backend/app` makes `from config import settings` resolve. The test file runs the same way (script invocation adds `backend/pipeline/` to the path).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd C:\Users\Garvi\Desktop\Projects\FloatChat && $env:PYTHONPATH="C:\Users\Garvi\Desktop\Projects\FloatChat\backend\app"; & "C:\Users\Garvi\Desktop\Projects\FloatChat\backend\.venv\Scripts\python.exe" backend\pipeline\test_ingest_many.py`
Expected: 4 tests OK, e.g. `Ran 4 tests ... OK`.

- [ ] **Step 6: Commit**

```bash
git add data/float_manifest.csv backend/pipeline/ingest_many.py backend/pipeline/test_ingest_many.py
git commit -m "data: add float manifest + batch ingest driver"
```

---

### Task 2: Run the batch ingestion (real GDAC download + load)

**Files:**
- Execute: `backend/pipeline/ingest_many.py` (no file changes)

**Interfaces:**
- Consumes: `ingest_manifest()` from Task 1.
- Produces: live DB rows in `argo_floats`, `argo_profiles`, `argo_measurements`, plus rebuilt `qc_stats` and `regional_monthly_avg`.

- [ ] **Step 1: Run the full ingestion**

Run: `cd C:\Users\Garvi\Desktop\Projects\FloatChat && $env:PYTHONPATH="C:\Users\Garvi\Desktop\Projects\FloatChat\backend\app"; & "C:\Users\Garvi\Desktop\Projects\FloatChat\backend\.venv\Scripts\python.exe" backend\pipeline\ingest_many.py`
Expected: per-float `[ok]` lines with real profile/measurement/excluded counts, then a `summary:` line with `succeeded >= 15` (14 new + 1 existing re-ingest) and `failed: 0`. Any `[fail]` lines must be investigated, not ignored.

- [ ] **Step 2: Show before/after DB counts**

Run (via pipeline owner role):
```powershell
$py = "C:\Users\Garvi\Desktop\Projects\FloatChat\backend\.venv\Scripts\python.exe"
$code = @'
import psycopg
conn = psycopg.connect("host=localhost port=55432 dbname=floatchat user=floatchat_owner password=floatchat_dev")
cur = conn.cursor()
for tbl in ("argo_floats", "argo_profiles", "argo_measurements", "qc_stats", "regional_monthly_avg"):
    cur.execute(f"SELECT COUNT(*) FROM {tbl}")
    print(tbl, cur.fetchone()[0])
cur.execute("SELECT region, COUNT(*) FROM argo_profiles GROUP BY region ORDER BY region")
print("profiles by region:", cur.fetchall())
cur.execute("SELECT region, COUNT(*) FROM argo_measurements m JOIN argo_profiles p USING(profile_id) GROUP BY region ORDER BY region")
print("measurements by region:", cur.fetchall())
conn.close()
'@
& $py -c $code
```
Expected: `argo_floats` = 15; each of the 3 regions has a non-zero profile/measurement count.

- [ ] **Step 3: Commit (if the run surfaced any code fixes)**

If Task 2 required edits to `ingest_many.py`, commit them: `git add -A && git commit -m "data: fix batch ingest during expansion run"`. Otherwise skip — no commit for a data-only run (NetCDF files are gitignored).

---

### Task 3: Functional verification via live API

**Files:**
- Execute: live backend `/query` (no file changes)

**Interfaces:**
- Consumes: the expanded DB from Task 2 + the running FastAPI backend on `127.0.0.1:8000`.
- Produces: raw `/query` responses proving regional coverage.

- [ ] **Step 1: Confirm backend health**

Run: `Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/health"`
Expected: `status = ok`, `db_connected = true`.

- [ ] **Step 2: Query all 3 regions**

Run:
```powershell
$queries = @(
  @{ question = "what's the average temperature in the Arabian Sea in 2023"; language = "en" },
  @{ question = "what's the average temperature in the Bay of Bengal in 2023"; language = "en" },
  @{ question = "what's the average temperature in the Andaman Sea in 2018"; language = "en" }
)
foreach ($q in $queries) {
  $r = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/query" -ContentType "application/json" -Body ($q | ConvertTo-Json)
  "{0} -> chart={1} refusal={2} | {3}" -f $q.question, $r.chart_type, $r.refusal_reason, $r.answer_text
  $r.explainability.sql
}
```
Expected: each region returns a non-`none` chart_type, empty `refusal_reason`, a real `answer_text`, and non-empty SQL. Also verify a previously-refused query now answers, e.g. `"what's the average temperature in the Arabian Sea last year"` returns real data (not `no_data`).

- [ ] **Step 3: Confirm comparison confidence improves**

Run: `POST /query` with `{"question":"what's the average temperature in the Bay of Bengal in 2023","language":"en"}` and inspect `confidence` + the `explainability` block (float count should now be >= 3, vs 1 before).
Expected: confidence not solely driven by single-float coverage; explainability shows multiple floats.

- [ ] **Step 4: No commit needed**

This task changes no code; nothing to commit.

---

### Task 4: Regenerate the data dump for hosted load

**Files:**
- Modify: `data/floatchat_data.sql` (regenerated)

**Interfaces:**
- Consumes: expanded DB from Task 2.
- Produces: updated `data/floatchat_data.sql` matching the expanded dataset (LOAD_ORDER.md hosted path).

- [ ] **Step 1: Re-export the data dump**

Run:
```powershell
$env:PGPASSWORD = "floatchat_dev"
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" --host localhost --port 55432 --username floatchat_owner --dbname floatchat --data-only -t public.argo_floats -t public.argo_profiles -t public.argo_measurements -t public.qc_stats -t public.regional_monthly_avg -f "C:\Users\Garvi\Desktop\Projects\FloatChat\data\floatchat_data.sql"
```
Expected: command exits 0; `floatchat_data.sql` size grows well beyond its previous single-float size; `SELECT COUNT(*) FROM argo_floats` in the dump is 15.

- [ ] **Step 2: Spot-check the dump**

Run: `Select-String -Path "C:\Users\Garvi\Desktop\Projects\FloatChat\data\floatchat_data.sql" -Pattern "6903062|2902264|2902702" | Select-Object -First 3`
Expected: at least one line mentioning each new float ID (confirming they made it into the dump).

- [ ] **Step 3: Commit**

```bash
git add data/floatchat_data.sql
git commit -m "data: regenerate dump with 15-float expansion"
```

---

### Task 5: Plan-level verification sweep

**Files:**
- Execute: no code changes; final acceptance checks.

**Interfaces:**
- Consumes: everything from Tasks 1-4.

- [ ] **Step 1: Re-run the manifest tests**

Run: `cd C:\Users\Garvi\Desktop\Projects\FloatChat && $env:PYTHONPATH="C:\Users\Garvi\Desktop\Projects\FloatChat\backend\app"; & "C:\Users\Garvi\Desktop\Projects\FloatChat\backend\.venv\Scripts\python.exe" backend\pipeline\test_ingest_many.py`
Expected: 4 tests OK (e.g. `Ran 4 tests ... OK`).

- [ ] **Step 2: Verify idempotency**

Run: `cd C:\Users\Garvi\Desktop\Projects\FloatChat && $env:PYTHONPATH="C:\Users\Garvi\Desktop\Projects\FloatChat\backend\app"; & "C:\Users\Garvi\Desktop\Projects\FloatChat\backend\.venv\Scripts\python.exe" backend\pipeline\ingest_many.py`
Expected: second run is effectively a no-op — all floats `[ok]` with the same counts as Task 2 (idempotent via `ON CONFLICT DO NOTHING`), `succeeded: 15`, `failed: 0`, exit 0.

- [ ] **Step 3: Confirm no accidental scope changes**

Run: `git status --short`
Expected: only expected files changed (manifest, ingest_many.py, test, data dump). No changes to `frontend/`, `backend/app/`, `SCHEMA_AND_PROMPTS.md`, or schema files.

- [ ] **Step 4: Log the run in the SDD ledger**

Append a dated entry to `.superpowers/sdd/2026-08-20-dataset-expansion/progress.md` summarizing the 15 floats, before/after counts, API verification results, and any failures encountered.