# FloatChat — Product Requirements Document
**SIH25040 | Ministry of Earth Sciences (MoES) | Theme: Miscellaneous**
**Version 1.0 — Internal Hackathon Prototype**

---

## 1. Problem Statement

ARGO is a global network of ~4000 autonomous ocean floats that continuously measure
temperature, salinity, and pressure at varying depths, transmitting data via satellite.
This data is public and scientifically invaluable — but locked behind NetCDF file formats,
technical query tools, and domain expertise that only trained oceanographers possess.

Researchers, students, policymakers, coastal planners, and the maritime industry cannot
currently ask a simple question like *"How warm was the Arabian Sea last March compared
to the 5-year average?"* without writing code.

**FloatChat closes this gap**: a conversational AI interface that turns natural-language
questions into validated, visualized answers grounded in real ARGO data.

---

## 2. Vision

FloatChat is not a lookup tool. It is a **trustworthy oceanographic analyst** you can talk to —
one that shows its work, admits uncertainty, and speaks the user's language (literally).

Most competing SIH25040 submissions will build: chatbot → text-to-SQL → chart. That is the
**floor**, not the product. FloatChat differentiates on three axes: **explainability,
uncertainty-honesty, and comparative insight** — the things a real scientist would demand
before trusting an AI's answer about ocean data.

---

## 3. Target Users

| User | Need |
|---|---|
| Researcher / student | Fast exploratory queries without writing NetCDF parsing code |
| Policymaker / MoES analyst | Plain-language climate/ocean-health summaries |
| Coastal community / fisherfolk cooperative | Vernacular access to local sea conditions |
| Maritime industry | Quick historical comparisons for planning |

---

## 4. Core Differentiators (Non-Negotiable for Demo)

These are what separate FloatChat from the ~15-20 near-identical submissions judges will see.

### 4.1 Explainable Answers ("Show Your Work" panel)
Every response includes a collapsible panel showing:
- The floats used (IDs, count)
- The generated SQL query
- Number of readings excluded due to failing QC flags
- Data time range actually queried vs. requested

**Why it matters:** directly counters the #1 judge concern about LLM-generated answers —
hallucination. Cheap to build, high credibility payoff.

### 4.2 Uncertainty-Aware Responses
Confidence is computed from **two signals**, not just float count:
1. **Float density** — how many floats reported in the queried region/time window
2. **QC-pass ratio** — what fraction of readings in that window passed QC (flags 1-2) vs.
   were excluded (flags 3-4)

A region with 10 floats but a 60% bad-reading ratio should show *lower* confidence than a
region with 5 floats and a 95% good-reading ratio — float count alone is misleading.

Example outputs:
> "Only 2 floats reported in this region during this period — confidence is low."
> "14 floats reported here, but 45% of readings failed quality checks — confidence is low."
> "12 floats reported here with 96% of readings passing quality checks — high confidence."

Never present a smooth, confident chart from thin or low-quality data as if it were dense
and reliable.

### 4.3 Comparative / Anomaly Framing
Beyond raw retrieval, FloatChat answers "is this normal?":
> "March 2023 was 1.4°C warmer than the 5-year average for this region."

This reframes the tool from a lookup utility into an insight engine — directly relevant to
MoES's climate and ocean-hazard monitoring mandate.

### 4.4 Vernacular-First Access
Hindi (stretch: 1-2 more regional languages) is a first-class query language, not a bolted-on
translation layer — full round trip: Hindi question → Hindi-annotated answer + chart.

### 4.5 Float Metadata Transparency (stretch, P1)
Surface float-level metadata (sensor age, deployment date, last transmission) alongside
readings where relevant — an 8-year-old float nearing end-of-life gives less reliable data
than a newly deployed one, and showing this is a level of rigor most competing teams won't
attempt.

---

## 5. Feature Scope

### Must-Have (P0 — demo depends on these)
- [ ] Natural language → SQL query pipeline (Gemini, few-shot, schema-grounded)
- [ ] Real ARGO data ingested (Indian Ocean subset, NetCDF → PostgreSQL/PostGIS)
- [ ] QC-flag filtering applied at ingestion, not query time
- [ ] Depth-profile chart (temperature/salinity vs. depth)
- [ ] Float trajectory map
- [ ] Time-series chart (parameter over time, region-scoped)
- [ ] "Show your work" explainability panel
- [ ] Uncertainty flag on sparse-data answers
- [ ] Graceful "no data available" response (never fabricate)
- [ ] Chat UI with conversation history

### Should-Have (P1 — headline differentiator)
- [ ] Comparative/anomaly queries (vs. historical average)
- [ ] Hindi query support (full round trip)
- [ ] Region comparison (e.g., Arabian Sea vs. Bay of Bengal)

### Could-Have (P2 — only if Day 3 goes smoothly)
- [ ] Click/draw region on map instead of typing coordinates
- [ ] Multi-turn follow-up questions ("now show me the same for June")
- [ ] Export chart/answer as shareable image

### Out of Scope (this prototype)
- Global ocean coverage (Indian Ocean subset only)
- Biogeochemical parameters (oxygen, chlorophyll) unless time permits
- User accounts / auth
- Real-time float data ingestion (batch/static dataset is fine for demo)

---

## 6. Example Query Set (Demo Script Basis)

Rehearse these 8 query types until they're reliable — reliability beats breadth:

1. "What was the temperature at 500m depth near Mumbai in December 2023?"
2. "Show me the salinity profile of float [ID]"
3. "Plot the trajectory of float [ID] over the last year"
4. "Was March 2023 unusually warm in the Arabian Sea?" *(comparative)*
5. "Compare temperature trends in the Arabian Sea vs Bay of Bengal in 2023"
6. "मुंबई के पास पिछले महीने समुद्र का तापमान कितना था?" *(Hindi)*
7. A deliberately sparse-data query → triggers uncertainty flag
8. A deliberately out-of-scope query (e.g., Pacific Ocean, out of dataset) → graceful refusal

---

## 7. Success Criteria (Internal Hackathon Judging)

- **Correctness**: every demoed answer is traceable to real, QC-passed data
- **Trustworthiness**: judges can see *why* an answer was generated, not just the answer
- **Reliability**: all 8 demo queries work every time, live, without fallback to screenshots
- **Distinctiveness**: judges can articulate what FloatChat does that a generic chatbot-on-CSV doesn't
- **Polish**: UI feels like a finished product, not a hackathon scaffold

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| NetCDF ingestion takes longer than expected | Start Day 1 hour 1; use a small float subset first, scale later |
| Gemini generates invalid/unsafe SQL | Guardrail layer: schema-restricted, read-only DB user, query validation before execution |
| Hindi support underperforms | Treat as P1 stretch, not P0 — don't let it block core demo |
| Live demo query fails | Rehearse 3x; have a pre-recorded backup clip as fallback only |

---

## 9. Team Ownership Map

See `PHASES.md` for day-by-day plan and `ARCHITECTURE.md` for component ownership.
