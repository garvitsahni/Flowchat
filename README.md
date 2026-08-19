# FloatChat

A conversational AI interface over real ARGO ocean-float data. Ask a question in
English or Hindi, get an answer that shows its work, states its confidence, and
draws the chart or map to back it up.

FloatChat is a prototype for Smart India Hackathon 2025 (SIH25040, Ministry of
Earth Sciences). It is a working demo, not a research tool.

## Why this exists

ARGO floats form a global network of roughly 4,000 autonomous ocean buoys that
measure temperature, salinity, and pressure as they drift. The data is public
and invaluable. It also lives in NetCDF files that only someone trained in
oceanography can query.

FloatChat closes that gap. You type a plain-language question. It turns the
question into SQL, runs that SQL against real ingested data, and answers in
words, with a chart and a full audit trail.

The design goal is trust, not just accuracy. A scientist would not accept a
black-box number about real ocean data. FloatChat does not ask you to accept one
either.

## What makes it different

- **Explainability panel.** Every answer carries a collapsible "How I got this"
  drawer: the generated SQL, the float IDs used, how many readings were excluded
  for failing quality checks, and the actual time range queried.
- **Honest confidence.** Confidence comes from two signals: float density and the
  fraction of readings that passed QC in the queried window. Sparse or
  low-quality coverage gets a visible low-confidence badge instead of a smooth,
  confident-looking chart.
- **Comparative framing.** It answers "is this normal?" questions, comparing a
  target period against a baseline average ("March 2003 was 9.7°C warmer than the
  same-month baseline").
- **Vernacular-first Hindi.** Hindi is a first-class query language, not a
  translation bolt-on. The full round trip works: Hindi question in, Hindi
  answer and chart out.
- **Graceful refusal.** Out-of-scope questions ("What's the temperature near
  California?") and empty regions return an honest "no data" response. No code
  path fabricates an unattributed number.
- **Guardrailed SQL.** The LLM never touches the database directly. Generated SQL
  passes through a guardrail layer: SELECT-only, schema-whitelisted, executed
  through a read-only database role.

## Live dataset

The prototype runs on a real, QC-passed slice of the Indian Ocean subset:

| Scope | Value |
|---|---|
| Float | `2900226` |
| Region | Bay of Bengal |
| Period | Oct 2002 – Aug 2004 |
| Profiles | 125 |
| Measurements | 3,029 |

The dataset is deliberately small. That keeps demo queries reliable, which
matters more than coverage. The schema and pipeline are region-agnostic; the
narrow scope is a demo decision, not a technical ceiling.

## Architecture

```
Frontend (React + Vite, Plotly, Leaflet)
  POST /query, GET /health  (REST/JSON)
Backend (FastAPI)
  AI Orchestrator  ->  Guardrail Layer  ->  PostgreSQL + PostGIS
                                     ^
                        Data pipeline (offline: NetCDF -> xarray -> load)
```

The pipeline ingests ARGO NetCDF files and applies QC-flag filtering at load
time, not query time. The backend routes each question through the orchestrator,
validates any generated SQL, executes it read-only, assesses confidence, and
assembles the response payload. See `ARCHITECTURE.md` for the full diagram and
the response contract, and `SCHEMA_AND_PROMPTS.md` for the schema and few-shot
prompt set.

## Repo layout

```
backend/
  app/                 FastAPI app: main.py, guardrails.py, uncertainty.py,
                       answers.py, viz.py, db.py, config.py, schemas.py
  app/orchestrator/    LLM providers: mock, gemini, openrouter, nvidia, groq
  pipeline/            Offline data pipeline: download.py, ingest.py,
                       precompute.py, schema.sql
  requirements.txt
frontend/
  src/components/      ChatPanel, VizPanel, TrajectoryMap, ConfidenceBadge,
                       ExplainabilityDrawer
  src/lib/             api.ts (backend client), mock.ts, cn.ts
  tailwind.config.js   Design tokens (DESIGN.md)
data/
  netcdf/              Downloaded ARGO source files
  floatchat_data.sql   pg_dump of the ingested subset (Supabase load)
  LOAD_ORDER.md        Hosted-DB load steps
docs/
  superpowers/         Specs and implementation plans
*.md                   PRD, ARCHITECTURE, DESIGN, PHASES, TECH_STACK, etc.
```

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Docker (for the local database)
- An LLM API key (optional; the app runs in deterministic mock mode without one)

### 1. Database

Local Postgres with PostGIS, via Docker:

```bash
docker compose up -d db
```

This starts `postgis/postgis:16-3.4` on port `55432` and creates the schema from
`backend/pipeline/schema.sql`. To load data, either run the ingest pipeline
(`backend/pipeline/ingest.py`) against the NetCDF files in `data/netcdf/`, or
load the SQL dump. For a hosted database (Supabase), follow `data/LOAD_ORDER.md`.

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # edit credentials
uvicorn app.main:app --reload --port 8000
```

**Windows note:** run uvicorn with `--loop app.loops:selector_loop_factory`.
The async Postgres driver needs a SelectorEventLoop, and uvicorn's default
Proactor loop on Windows breaks it:

```bash
uvicorn app.main:app --reload --port 8000 --loop app.loops:selector_loop_factory
```

Verify: `curl http://localhost:8000/health` returns
`{"status":"ok","db_connected":true}`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves on `http://localhost:5173` and proxies `/query` and `/health` to
`http://127.0.0.1:8000`, so no frontend env vars are needed for local dev. To
point at a deployed backend instead, set `VITE_API_BASE` in `frontend/.env`.

## Configuration

### LLM providers

Set `LLM_PROVIDER` in `backend/.env`. The default is `mock`, which is
deterministic and needs no API key. It still generates real SQL against the real
schema, so the demo works end to end without external calls.

| Provider | Env var | Model override |
|---|---|---|
| `mock` | (none) | (built in) |
| `gemini` | `GEMINI_API_KEY` | `GEMINI_MODEL` |
| `openrouter` | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` |
| `nvidia` | `NVIDIA_API_KEY` | `NVIDIA_MODEL` |
| `groq` | `GROQ_API_KEY` | `GROQ_MODEL` |

The backend degrades gracefully. If the provider has no key or fails, or the
guardrail rejects its SQL, the request falls back to the deterministic mock
provider. A rejection that the mock also can't satisfy returns a graceful "I
couldn't safely answer that" refusal. The app never surfaces a raw database or
provider error to the user.

### Frontend mock mode

Set `VITE_USE_MOCK=true` in `frontend/.env` to serve canned responses with no
backend at all. Handy for UI-only work.

## Running the demo

`DEMO_SCRIPT.md` is the rehearsed 6-8 minute pitch, with exact query strings and
narrative beats. It is organized around trust: start with a hard case, then show
the explainability panel, a comparison insight, and the Hindi round trip. Query
the exact strings in the script; regions and dates outside the live subset (the
Arabian Sea, Mumbai, 2019, 2023) deliberately hit the no-data path.

## Deployment

Deployment config is included but the live deployment is pending credentials.

- **Backend:** `render.yaml` (Render blueprint, Docker). Point `DB_*` env vars at
  a hosted Postgres+PostGIS with a SELECT-only pooler user, per
  `data/LOAD_ORDER.md`. Never point the app at an owner role.
- **Frontend:** `netlify.toml` and `vercel.json`. Set `VITE_API_BASE` to the
  deployed backend URL in the hosting dashboard.

## Docs

- `PRD.md` — product requirements, feature scope, success criteria
- `ARCHITECTURE.md` — system design and the `/query` response contract
- `SCHEMA_AND_PROMPTS.md` — Postgres schema and the few-shot NL-to-SQL prompt set
- `DESIGN.md` — design tokens and UI system
- `PHASES.md` — day-by-day build plan
- `TECH_STACK.md` — stack rationale
- `AGENTS.md` — working rules for AI agents on this repo

## Notes for contributors

- The schema and the few-shot prompt set are tightly coupled. Changing a column
  or table without updating the few-shot examples in the same change silently
  breaks the orchestrator.
- QC-flag filtering happens at ingestion, not at query time. Keep it that way.
- There is no automated test suite in this repo. Verification is the production
  frontend build (`npm run build` in `frontend/`) and live endpoint checks against
  `/health` and `/query`.
- Do not expand the data coverage beyond the Indian Ocean subset without team
  sign-off.