# Plain-language Term Explanations — Design Spec

**Date:** 2026-08-21
**Status:** Approved for implementation

---

## Problem

The answer output shows scientific terms ("ARGO floats", "QC flag 4", "readings", "usable %", "calculation") that non-technical users may not understand. There's already backend infrastructure (`_build_explanations` in `main.py:349`, `Explainability.explanations` in the response contract) and frontend types (`types.ts:17`) — but the explanations are never rendered.

---

## Approach: Backend-driven glossary dict + frontend rendering (Approach A)

Expand the existing `explanations` dict to cover all 5 terms (en + hi), then render:
1. **Answer strip** — a brief 1–2 sentence gloss under the answer text for the headline term per chart type
2. **Panel glosses** — muted sub-line under each raw row in "How I got this" panel

**No response-shape change** — only additive dict keys (contract-safe per AGENTS.md).

---

## 1. Backend Changes — `backend/app/main.py`

### Function: `_build_explanations(floats_used, qc_excluded_count, time_range, language)`

Expand returned dict with these keys (keep existing `floats_used`, `qc_excluded`, `time_range`, `sql`):

| Key | EN Gloss | HI Gloss |
|-----|----------|----------|
| `floats_used` | "ARGO floats are robotic ocean sensors that drift and measure temperature/salinity." | Existing Hindi |
| `readings` | "A reading is one measurement taken at a single depth and time by a float." | New |
| `qc_excluded` | "QC flag 4 marks readings that look unreliable; they're removed at ingestion so answers use only trustworthy data." | Existing Hindi (wording kept) |
| `usable` | "The share of readings that passed quality checks and could be used." | New |
| `calculation` | "The value shown is the mean (average) computed across all valid readings." | New |
| `time_range` | "The dates the data spans." | Existing |

No signature change — glosses are static definitions; counts already interpolated where available.

---

## 2. Frontend Changes

### `EvidencePanel.tsx`

- Each row gets an `explanationKey` mapping to the backend dict keys
- If `info.explanations[key]` exists, render a muted sub-line under the row's value
- Row → key mapping:
  - `data source` → `floats_used`
  - `observations` → `readings`
  - `quality checks` → `qc_excluded`
  - `usable readings` → `usable`
  - `calculation` → `calculation`
  - `date range` → `time_range`

### `AnswerCard.tsx`

Add a brief strip under the answer text (above confidence badge) using headline term per chart type:
- `depth_profile`, `trajectory`, `metadata` → `floats_used`
- `time_series`, `heatmap` → `readings`
- `comparison` → `calculation`

Hidden when `chart_type === "none"` or gloss missing. Styled like existing muted mono glosses (DESIGN.md palette).

---

## 3. Verification

- Backend: `POST /query` for each chart type + `language: "hi"` — assert `explanations` contains all keys
- Frontend: `npm run build` (tsc passes) + manual dev-server check: strip under answer, gloss sub-lines in panel

---

## Files Touched

- `backend/app/main.py`
- `frontend/src/components/chat/EvidencePanel.tsx`
- `frontend/src/components/chat/AnswerCard.tsx`

(`frontend/src/types.ts` already has `explanations?: Record<string,string>`)