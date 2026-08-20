# FloatChat — Dataset Expansion Design

**Date:** 2026-08-20
**Status:** Approved (brainstorming complete)
**Scope:** Expand the ARGO dataset from 1 float to 15 floats across all 3 Indian Ocean regions, with a checked-in manifest and a batch ingest driver.

---

## 1. Problem

The live dataset currently contains exactly **1 float** (2900226, Bay of Bengal, Oct 2002–Aug 2004, 3,029 measurements, 2,475 valid). Consequences:

- Regional queries for **Arabian Sea** and **Andaman Sea** always return `no_data`.
- Modern-year queries ("this year", "last year", 2018–2025) always return `no_data` — the only float stopped reporting in 2004.
- The comparison/anomaly baseline (`regional_monthly_avg`) is computed from a single float's single region, so comparative answers have low confidence (`min_float_count = 3` never satisfied).

The user requested more real data. The pipeline (`download.py` → `ingest.py` → `precompute.py`) already exists and supports arbitrary float IDs; only the *batch orchestration* and a *curated float list* are missing.

## 2. Scope

- **In scope:** Add 14 new real ARGO floats (verified to exist on the Ifremer GDAC) covering Bay of Bengal, Arabian Sea, and Andaman Sea, with profiles from 2018 onward. Add a checked-in float manifest and a batch ingest driver. Regenerate the data dump for the hosted load path.
- **Out of scope:** Schema changes, response-contract changes, mock-provider changes, frontend changes, new measurement variables (DO, pressure), expanding beyond the 3 Indian Ocean region boxes in `ingest.py`.

## 3. Constraints

- **Real data only** (AGENTS.md): every float in the manifest must exist on the Ifremer GDAC; verify before adding. No fabricated floats/values.
- **QC filtering stays at ingestion** (AGENTS.md, ARCHITECTURE.md §2.1): `ingest.py` already stores QC flags as-is and derives `is_valid = temp_qc_flag IN (1,2) AND salinity_qc_flag IN (1,2)`. No query-time QC changes.
- **Read-only app role unchanged** (ARCHITECTURE.md §2.4): the app keeps connecting as `floatchat_readonly`; ingestion/precompute run as the pipeline owner role.
- **Region labels assigned at ingest by bounding box** (ARCHITECTURE.md §2.1), never by the LLM. Region boxes in `ingest.py` are unchanged.
- **Stay within Indian Ocean subset** (AGENTS.md, PHASES.md): the 3 existing region boxes are the boundary.

## 4. Data Selection (manifest)

New file: `data/float_manifest.csv` — columns `float_id,dac,region`. 15 rows total (1 existing + 14 new). All URLs verified returning HTTP 200 against `https://data-argo.ifremer.fr/dac/{dac}/{float_id}/{float_id}_meta.nc` on 2026-08-20.

| float_id | dac | region | profiles | span |
|---|---|---|---|---|
| 2900226 | incois | Bay of Bengal | 125 | 2002–2004 (existing) |
| 2902264 | incois | Bay of Bengal | 268 | 2018–2023 |
| 2902236 | incois | Bay of Bengal | 256 | 2018–2021 |
| 2902235 | incois | Bay of Bengal | 246 | 2018–2021 |
| 2902775 | csio | Bay of Bengal | 249 | 2020–2026 |
| 2902766 | csio | Bay of Bengal | 242 | 2020–2026 |
| 6903062 | coriolis | Arabian Sea | 526 | 2021–2024 |
| 6903059 | coriolis | Arabian Sea | 501 | 2021–2025 |
| 6902946 | coriolis | Arabian Sea | 493 | 2019–2021 |
| 6903060 | coriolis | Arabian Sea | 491 | 2021–2024 |
| 6903063 | coriolis | Arabian Sea | 469 | 2021–2024 |
| 2902702 | csio | Andaman Sea | 97 | 2018 |
| 1901442 | aoml | Andaman Sea | 40 | 2018–2019 |
| 2902597 | csio | Andaman Sea | 20 | 2018 |
| 2902612 | csio | Andaman Sea | 9 | 2020 |

The manifest doubles as dataset documentation. It is the single source of truth for what is in the DB; the batch driver reads it directly.

## 5. Architecture & Data Flow

### New file: `backend/pipeline/ingest_many.py`

Batch driver with the following behavior:

1. Read `data/float_manifest.csv` (paths resolved relative to `REPO_ROOT`).
2. For each row, call the existing `download_float(float_id, dac)` — skips files already present unless `--force`.
3. Call the existing `ingest_float(float_id, dac)` — idempotent via `ON CONFLICT DO NOTHING`.
4. Run `precompute()` once at the end (only if at least one float ingested successfully).
5. Print a per-float summary table (profiles / measurements / excluded / status) and a final tally.

Flags:
- `--clean` — delete + re-ingest (passes through to `ingest_float`).
- `--only <float_id>` — ingest a single float from the manifest.
- `--skip-download` — assume NetCDF files are already in `data/netcdf/` (useful after a download-only run or for offline re-ingest).

No changes to `download.py`, `ingest.py`, `precompute.py`, `REGION_BOXES`, or the schema. The batch driver reuses the existing per-float functions unchanged.

### Data flow

```
float_manifest.csv
   │  read by
   ▼
ingest_many.py ──► download_float() ──► data/netcdf/{float_id}/*.nc
   │                    │
   │                    ▼
   │              ingest_float() ──► argo_floats / argo_profiles / argo_measurements
   │                    │
   └── precompute() ◄───┘   (after all floats)
            │
            ▼
    qc_stats + regional_monthly_avg rebuilt
```

### Resulting coverage (expected)

- Bay of Bengal: 6 floats, 2018–2026 (plus legacy 2002–2004 float).
- Arabian Sea: 5 floats, 2019–2025.
- Andaman Sea: 4 floats, 2018–2020.
- ~4,000+ additional profiles and ~100k+ measurements; exact counts come from the real files and are reported verbatim during verification.

## 6. Error Handling

- Per-float isolation: `ingest_many.py` wraps each float in try/except, logs the error, and continues to the next float. A final summary reports successes and failures with reasons.
- A manifest row that 404s on the GDAC (or fails download) is reported as a failure — never silently skipped.
- Exit code 0 if at least one float succeeded; non-zero if all failed.
- `precompute()` only runs if there is at least one successful ingest.

## 7. Verification & Acceptance Criteria

Per AGENTS.md, completion is proven with raw output, not claims.

1. **Ingest run output** — show the per-float summary table from `ingest_many.py` with real counts.
2. **DB row counts** — show before/after counts for `argo_floats`, `argo_profiles`, `argo_measurements`, `qc_stats`, `regional_monthly_avg` via the pipeline owner role.
3. **Functional check via live API** — query the running backend (LLM provider = mock):
   - "average temperature in the Arabian Sea in 2023" → real comparison answer, non-empty SQL.
   - "average temperature in the Bay of Bengal in 2023" → real answer.
   - "average temperature in the Andaman Sea in 2018" → real answer.
   - Previously-refused queries ("... last year") now answer with real data where coverage exists.
4. **Idempotency** — re-run `ingest_many.py`; second run is a no-op and exits 0.
5. **Data dump regenerated** — `data/floatchat_data.sql` re-exported via pg_dump for the hosted/Supabase load path (LOAD_ORDER.md).

## 8. Out of Scope / Explicitly Not Doing

- No schema or response-contract changes.
- No mock provider changes (spelling aliases already fixed separately).
- No frontend changes.
- No new measurement variables beyond temp/salinity/QC already ingested.
- No expansion beyond the 3 existing Indian Ocean region boxes.