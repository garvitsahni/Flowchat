# FloatChat — Day 1 Foundation Design

**Date:** 2026-08-18
**Status:** Approved by user (Garvi)
**Source docs:** `PHASES.md` Day 1, `ARCHITECTURE.md`, `SCHEMA_AND_PROMPTS.md`, `DESIGN.md`, `TECH_STACK.md`, `AGENTS.md`

---

## 1. Goal

Execute the PHASES.md Day 1 checkpoint: **schema locked, real data flowing through the full
stack once** — chat input → `/query` → guardrail → read-only Postgres → uncertainty check →
phrased answer → chart + explainability drawer.

## 2. Key Decisions (locked with user)

| Decision | Choice | Rationale |
|---|---|---|
| Scope | All Day 1 tracks in one session | Full foundation: pipeline, backend, AI, frontend |
| Database | Docker Postgres + PostGIS (local) | Supabase remote timed out; fully offline, matches schema exactly |
| AI keys | Gemini / OpenRouter / Grok arrive later | Build `LLMProvider` abstraction; deterministic mock resolver is default until a key is present |
| Data source | Live download from Ifremer Argo GDAC | `https://data-argo.ifremer.fr/` reachable; INCOIS float `2900226` confirmed (~1.1 MB total) |
| Repo layout | Monorepo `backend/` + `frontend/` | Matches PHASES.md role split, single checkpoint |

## 3. Repository Layout

```
FloatChat/
├── docker-compose.yml          # postgis/postgis on 5432
├── .env.example                # documented keys, no real values
├── .gitignore
├── data/                       # downloaded NetCDF (gitignored)
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py             # FastAPI: /query, /health
│   │   ├── schemas.py          # Pydantic — the locked §4 response contract
│   │   ├── config.py           # env → settings
│   │   ├── db.py               # read-only connection pool
│   │   ├── orchestrator/
│   │   │   ├── base.py         # LLMProvider protocol
│   │   │   ├── mock.py         # deterministic resolver (default)
│   │   │   ├── gemini.py       # scaffold, gated on GEMINI_API_KEY
│   │   │   ├── openrouter.py   # scaffold, gated on OPENROUTER_API_KEY
│   │   │   └── grok.py         # scaffold, gated on GROK_API_KEY
│   │   ├── guardrails.py       # SELECT-only + schema whitelist + caps
│   │   ├── uncertainty.py      # qc_stats thresholds → confidence
│   │   └── answers.py          # deterministic phrasing pass
│   └── pipeline/
│       ├── schema.sql          # SCHEMA_AND_PROMPTS.md §1 verbatim
│       ├── download.py         # GDAC fetch for a float ID
│       ├── ingest.py           # NetCDF → Postgres (QC at load)
│       └── precompute.py       # qc_stats + regional_monthly_avg
└── frontend/
    └── src/
        ├── App.tsx
        ├── components/         # ChatPanel, VizPanel, ExplainabilityDrawer, ConfidenceBadge
        ├── lib/api.ts          # POST /query against the contract
        └── lib/mock.ts         # mock responses matching the contract exactly
```

## 4. Database

- `docker compose up -d` runs `postgis/postgis:latest` on `5432`.
- Schema loaded from `pipeline/schema.sql` verbatim (SCHEMA_AND_PROMPTS.md §1).
- **Roles:**
  - `floatchat_owner` — pipeline (DDL + INSERT)
  - `floatchat_readonly` — app queries (SELECT-only), defense-in-depth per ARCH §2.4
- Region labeling (Arabian Sea / Bay of Bengal / Andaman Sea / other) assigned at ingest by
  bounding-box lookup — never by the LLM.

## 5. Data Pipeline (real data, Day 1)

- `download.py` fetches float `2900226` from `https://data-argo.ifremer.fr/dac/incois/2900226/`:
  `_prof.nc`, `_meta.nc`, `_Rtraj.nc`.
- `ingest.py` parses via `xarray`/`netCDF4`:
  - `argo_floats` ← meta (id, deploy date/lat/lon, status)
  - `argo_profiles` ← prof file cycles (date, lat, lon, PostGIS point, region)
  - `argo_measurements` ← per-depth temp/salinity + QC flags
- QC flags 3-4 retained in DB but excluded from default queries via generated `is_valid`
  column (ARCH §2.1). Excluded count surfaced for the explainability panel.
- `precompute.py` fills `qc_stats` (per region/month) and `regional_monthly_avg`
  (per region/month/100m depth bucket).

## 6. Backend + AI Orchestrator

- FastAPI `/health` and `/query`; **all I/O through Pydantic models** — no raw dicts across
  the API boundary.
- `LLMProvider` protocol:
  - `generate_sql(question, language) -> GeneratedSQL | Unsupported`
  - `phrase_answer(results, confidence, region, time_range, language) -> str`
  - `mock.py` is the default resolver: deterministic intent detection over the core query
    types (depth_profile, trajectory, time_series, comparison, unsupported), returning the
    SQL patterns from SCHEMA_AND_PROMPTS.md §2.
  - `gemini.py` / `openrouter.py` / `grok.py`: real client scaffolds that activate when
    their env key is present. Provider chosen by `LLM_PROVIDER` setting.
- `guardrails.py`: reject non-SELECT; whitelist schema tables/columns; row + time caps;
  execute via `floatchat_readonly`. Rejection → graceful message, never a raw DB error.
- `uncertainty.py`: `float_count < 3` → low ("limited float coverage"); `qc_pass_ratio < 0.7`
  → low ("high proportion of readings failed quality checks"); else high.
- `answers.py`: deterministic phrasing (1 decimal), appends low-confidence note. Swappable
  for the LLM phrasing call once providers land.

## 7. Response Contract (locked, verbatim from ARCHITECTURE.md §4)

```json
{
  "answer_text": "string",
  "language": "en | hi",
  "chart_type": "depth_profile | trajectory | time_series | comparison | none",
  "chart_data": {},
  "confidence": "high | low",
  "confidence_note": "string",
  "explainability": {
    "sql": "string",
    "floats_used": ["string"],
    "qc_excluded_count": 0,
    "time_range_queried": "string"
  }
}
```

## 8. Frontend

- React + Vite + Tailwind, tokens from DESIGN.md §2 verbatim (Abyssal palette, IBM Plex Mono
  for numbers, Inter body, Noto Sans Devanagari for Hindi).
- Components: ChatPanel, VizPanel (Plotly depth profile with inverted y-axis; Leaflet
  trajectory map on dark basemap), ExplainabilityDrawer (monospace SQL, float ID chips,
  QC-excluded count), ConfidenceBadge (amber, low-confidence only).
- `lib/mock.ts` matches the contract exactly; `lib/api.ts` POSTs to `/query`. A fetch flag
  (`VITE_USE_MOCK`) switches between them.

## 9. End-to-End Day 1 Checkpoint

Chat input → `POST /query` → mock orchestrator generates SQL → guardrail validates →
executes read-only against real ingested float data → uncertainty check → phrased answer →
chart + drawer render. Real data at the DB layer; only the LLM is mocked (by design).

## 10. Verification (AGENTS.md discipline)

- Pipeline: raw output of `ingest.py` + a `SELECT` count via the DB.
- Guardrail: prove `DELETE`/`DROP`/off-schema SQL is rejected.
- `/query`: one real happy-path curl (full JSON) + one sparse-data case showing low confidence.
- Frontend: `npm run build` passes; dev server renders mock flow.
- Git checkpoint before schema load and after each structural milestone.

## 11. Out of Scope (this session)

- Real LLM calls (all three providers scaffolded only).
- Hindi LLM phrasing (route is present; needs a provider).
- P1/P2 features (comparison phrasing, region comparison UI, etc.) beyond what the mock
  orchestrator needs for the core intents.
- Full dataset ingestion (1 float proves the pipeline; scale later per PHASES.md).