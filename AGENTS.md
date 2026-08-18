# AGENTS.md — FloatChat

Instructions for any AI coding agent (OpenCode, Claude Code, etc.) working on this repo.
Read this before writing or modifying any code.

---

## Project Context

FloatChat is a SIH25040 hackathon prototype: a conversational AI interface over real
ARGO ocean float data. See `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `PHASES.md` in the
repo root for full context before starting any task.

**Non-negotiable architectural rule**: the LLM (Gemini) never has direct, unguarded
write/execute access to the database. All generated SQL passes through the guardrail
layer (`ARCHITECTURE.md` §2.4) before execution — SELECT-only, schema-restricted,
read-only DB role. Do not "simplify" this away for convenience, even in a prototype.

---

## Verification Discipline (mandatory)

- **Never** report a task as complete based on your own summary. Always show the raw
  terminal output of the actual test/run that proves it.
- If fixing a bug, first **reproduce the failing test/error**, show that reproduction,
  *then* write the fix, then show the passing output. Do not fix first and explain after.
- Before any structural change (schema, response contract, prompt format), create a git
  checkpoint (`git add -A && git commit -m "checkpoint: before X"`) so it can be reverted
  cleanly if the change breaks something downstream.
- If a claimed fix touches a shared contract (e.g., the `/query` response JSON shape in
  `ARCHITECTURE.md` §4), flag it explicitly — other team members' code may depend on the
  exact shape.

---

## Data Integrity Rules

- Never fabricate ARGO data, float IDs, or measurement values for testing UI — use the
  real ingested subset, even a small slice of it, from hour one. Placeholder/mock JSON
  is fine for early frontend scaffolding (Day 1) but must match the real response
  contract exactly and must be clearly marked as mock in code comments.
- QC-flag filtering happens at ingestion (data pipeline), not as an afterthought at
  query time. If asked to "just filter QC flag 4 in the query," push back — this belongs
  in the pipeline per `ARCHITECTURE.md` §2.1.
- Any answer path that cannot cite floats/SQL used must return the graceful
  "insufficient data" response — never let a code path silently return an unattributed
  number.

---

## Schema & Prompt Changes

- The Postgres schema and the few-shot NL→SQL prompt set (`SCHEMA_AND_PROMPTS.md`) are
  tightly coupled. Do not change column names or table structure without updating the
  few-shot examples in the same change — a schema/prompt mismatch silently breaks the
  AI Orchestrator with no obvious error.

---

## Style / Stack Conventions

- Backend: FastAPI, Pydantic models for all request/response bodies — no raw dicts across
  the API boundary
- Frontend: React + Vite, functional components + hooks, Tailwind for styling using the
  tokens in `DESIGN.md` §2 — don't introduce ad hoc colors outside that palette
- Python: type hints on all function signatures in data pipeline and backend code
- Commit messages: short, imperative, prefixed by area, e.g. `data: fix QC flag filter`,
  `ai: add comparison intent detection`, `fe: add explainability drawer`

---

## What NOT to Do

- Do not add authentication/user accounts — out of scope for this prototype (`PRD.md` §5)
- Do not expand data coverage beyond the Indian Ocean subset without explicit team sign-off
  — scope creep here risks the Day 2/3 checkpoints in `PHASES.md`
- Do not silently swap the visualization library (Plotly/Leaflet) for something else, even
  if it seems easier — frontend split assumes these choices
- Do not remove or bypass the explainability panel to "simplify" a demo — it's a core
  differentiator, not optional polish
