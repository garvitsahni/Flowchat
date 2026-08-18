# FloatChat — Tech Stack

---

## Frontend

| Layer | Choice | Notes |
|---|---|---|
| Framework | React + Vite | Fast dev loop, team's default |
| Styling | Tailwind CSS | Configured against the "Abyssal" design tokens (`DESIGN.md`) |
| Charts | Plotly | Depth profiles, time series, comparison charts |
| Maps | Leaflet | Float trajectories, dark basemap (e.g. CartoDB Dark Matter) |
| Component generation | 21st.dev / Magic MCP | Prompted directly against design tokens for premium UI scaffolding |
| Fonts | IBM Plex Mono, Inter, Noto Sans Devanagari | Mono for numbers/data, Inter for body, Devanagari for Hindi mode |

## Backend

| Layer | Choice | Notes |
|---|---|---|
| API framework | FastAPI (Python) | Async, fast to scaffold |
| Data validation | Pydantic | Enforced on every request/response — no raw dicts across the API boundary |
| AI orchestration | Gemini API | Two separate calls: NL→SQL generation, and result→natural-language phrasing |
| Guardrails | Custom validation layer | SELECT-only, schema-whitelisted, executes via a read-only DB role |

## Database

| Layer | Choice | Notes |
|---|---|---|
| Primary DB | PostgreSQL | Core structured store |
| Geospatial | PostGIS extension | Powers region/coordinate queries (`ST_DWithin`, geography points) |
| Precomputed tables | `qc_stats`, `regional_monthly_avg` | Computed at ingestion — powers the uncertainty engine and comparative queries without expensive live aggregation |

## Data Pipeline (offline/batch)

| Layer | Choice | Notes |
|---|---|---|
| Source | ARGO NetCDF files | INCOIS or Ifremer FTP, Indian Ocean subset |
| Parsing | `xarray`, `netCDF4`, `pandas` | Standard scientific-data tooling |
| QC handling | ARGO QC flag filtering | Applied at load time, not query time (flags 1-2 kept, 3-4 excluded but retained for transparency) |

## Deployment

| Layer | Choice | Notes |
|---|---|---|
| Backend + DB | Railway or Render | Managed Postgres, avoids demoing off localhost |
| Frontend | Vercel or Netlify | Static/edge hosting, fast deploys |

---

## Why this stack

Built to match your existing workflow and minimize new-tool risk during a short sprint:

- **Gemini + deterministic guardrail layer** mirrors the pattern from AutoRecruit-Validator
  and PolicyLens — the LLM never owns the final verdict/output alone, a deterministic layer
  validates it first.
- **React / FastAPI / Postgres** is the same core stack as GreenRoute AI and Nyaay AI.
- **PostGIS** is the one genuinely new piece — required because ocean float data is
  inherently spatial (lat/lon queries, region lookups), which none of your past projects needed.
