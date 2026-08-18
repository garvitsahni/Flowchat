# FloatChat — Phased Build Plan
**Team size: 5-6 | Timeline: 2-4 days | Target: Internal hackathon working prototype**

---

## Role Assignments

| Role | Owns | Primary docs |
|---|---|---|
| **Data Engineer** | NetCDF ingestion, cleaning, Postgres/PostGIS schema, QC filtering | `ARCHITECTURE.md` §2.1, `SCHEMA_AND_PROMPTS.md` |
| **AI/Backend Lead** | Text-to-SQL pipeline, Gemini prompting, guardrails, uncertainty engine | `ARCHITECTURE.md` §2.3-2.5 |
| **Backend/API Dev** | FastAPI endpoints, response contract, DB connection layer | `ARCHITECTURE.md` §2.2, §4 |
| **Frontend Dev #1** | Chat UI, state management, language toggle | `DESIGN.md` |
| **Frontend Dev #2** | Visualization layer (charts, map, explainability drawer) | `DESIGN.md`, `ARCHITECTURE.md` §2.6 |
| **Floater / 6th person** | Bounces to biggest bottleneck (usually data eng or AI lead) Day 1-2; owns deployment + pitch deck + demo rehearsal Day 3-4 | `PRD.md` §6-7 |

---

## Day 1 — Foundation (all tracks start in parallel, hour 0)

**Goal by end of day: schema locked, dummy data flowing through the full stack once.**

- **Data Engineer**
  - Source a real ARGO subset (Indian Ocean, 6-12 months, from INCOIS or Ifremer FTP)
  - Get NetCDF → Postgres pipeline working for **1 float** end to end (prove the pipeline before scaling)
  - Draft schema, sync with AI lead before finalizing

- **AI/Backend Lead**
  - **Critical handoff**: finalize schema jointly with Data Engineer first — everything downstream depends on this
  - Stand up Gemini API call with a minimal mock table, get one hardcoded NL→SQL example working
  - Draft the response contract (`ARCHITECTURE.md` §4) with Backend Dev

- **Backend/API Dev**
  - Scaffold FastAPI project, `/query` and `/health` stubs
  - Connect to Postgres (even empty schema)
  - Lock response contract JSON shape with AI lead — this unblocks frontend

- **Frontend Dev #1**
  - Scaffold React/Vite chat shell, message list, input box
  - Build against **mock JSON** matching the locked response contract — do not wait on backend

- **Frontend Dev #2**
  - Pick and integrate Plotly + Leaflet
  - Build one depth-profile chart and one trajectory map against mock data

- **Floater**
  - Support whichever of Data Eng / AI Lead is behind by end of day (usually data ingestion)

**Checkpoint (end of Day 1):** response contract is locked in writing. Dummy data flows chat input → mock backend response → chart render, at least once, even if ugly.

---

## Day 2 — Real Integration

**Goal by end of day: one full real query working end-to-end, zero mocks remaining.**

- **Data Engineer**: scale ingestion to full target dataset; implement QC-flag filtering at load time; add geo-indexing (PostGIS); precompute `qc_stats` table for the uncertainty engine
- **AI/Backend Lead**: expand few-shot prompt set to 15-20 examples covering all P0 query types (depth profile, trajectory, time series, comparison); build guardrail layer (SELECT-only, schema-restricted, read-only DB role); build uncertainty engine against `qc_stats`
- **Backend Dev**: wire real AI Orchestrator output → real DB execution → real response assembly; add graceful error handling for no-data and invalid-query cases
- **Frontend Dev #1**: connect chat to real `/query` endpoint; handle loading/error states
- **Frontend Dev #2**: connect charts/map to real response data; build the explainability drawer (SQL shown, float count, QC-excluded count, confidence note)
- **Floater**: start P1 work early if Day 2 core is on track — Hindi prompt variants, or comparative query logic

**Checkpoint (end of Day 2):** query #1 from the demo script (`PRD.md` §6) works live, real data, no mocks.

---

## Day 3 — Breadth + Differentiators

**Goal by end of day: all 8 demo queries working reliably; P1 differentiators integrated.**

- Expand to all P0 query types (all charts, all intents)
- Implement comparative/anomaly framing (P1) — baseline-average SQL + phrasing
- Implement Hindi query round-trip (P1) — test with 2-3 real Hindi phrasings, not just translated English
- Frontend: polish transitions, loading states, empty states, error states
- Explicitly test and rehearse: sparse-data query (uncertainty flag) + out-of-scope query (graceful refusal)
- Start bug bash: **demand raw output, not agent/dev claims of "it works"** — reproduce every claimed fix before trusting it

**Checkpoint (end of Day 3):** all 8 demo script queries pass, live, 3 times in a row without manual intervention.

---

## Day 4 (if available) — Demo Readiness

- Full bug bash with git checkpoints before/after each fix
- Deploy to stable hosting (not localhost) — backend + DB + frontend
- Build pitch deck (problem → differentiators → live demo → architecture slide → impact)
- Rehearse demo script 2-3x full run-throughs, including a recovery plan if a live query fails
- Prepare 1 backup pre-recorded clip **only as last resort**, not as primary demo path

---

## Definition of Done (per phase)

- **Day 1 done** = contract locked + one mock round-trip works
- **Day 2 done** = one real round-trip works, zero mocked data
- **Day 3 done** = all 8 demo queries pass 3x in a row
- **Day 4 done** = deployed, rehearsed, deck ready

If a day's checkpoint isn't met, cut P2 scope before cutting P0 — reliability of fewer
query types beats breadth of unreliable ones.
