# UI Scale & Readability Design

Date: 2026-08-20
Status: Approved (Approach A + B)

## Problem

User feedback after the Claude-palette polish: "everything looks small." The current
UI uses a dense instrument-panel type scale — body 15px, messages 14px, chips 13px,
and many mono metadata labels at 10–11px. It reads cramped rather than polished.

## Goals

- Keep the ocean instrument-panel mono aesthetic and the existing token names (no
  palette or component-logic changes).
- Establish one consistent, larger type ladder so the UI reads like a polished ops
  dashboard.
- Loosen the tightest paddings/gaps.
- Retire only the truly redundant 10px footer hint ("Enter to send"). Informational
  `tracking-widest` labels (e.g. "DEPTH PROFILE", "CONFIDENCE HIGH") are retained —
  they carry meaning — and merely bumped to 12px.

## Non-goals

- No palette changes, no token renames, no component re-architecture, no Plotly/Leaflet
  swaps, no new features.

## New type scale

| Element | Current | New |
|---|---|---|
| Header title (`App.tsx` h1) | `text-lg` 18px | `text-xl` 20px |
| Body base (`index.css` body) | 15px | 16px |
| User/assistant messages + composer input | `text-[14px]` | `text-[15px]` |
| Suggestion chips + error messages | `text-[13px]` | `text-[14px]` |
| Empty-state heading (`Ask about...`) | `text-sm` 14px | `text-[15px]` |
| All meta/labels: header LIVE + dataset meta, message meta, language toggle, confidence badge, viz captions, trajectory-map overlay, explainability drawer | `text-[10px]` / `text-[11px]` / `text-xs` | `text-xs` 12px (and `text-[13px]` where previously `text-xs` 12px) |

## Spacing changes

- Suggestion chips: `py-1.5 px-3.5` → `py-2 px-4`
- Message cards: `px-3.5 py-2` → `px-4 py-2.5`
- Composer textarea: `px-3.5 pt-3` → `px-4 pt-3.5`
- Chat message stack: `space-y-4` → `space-y-5`
- Viz captions / drawer rows: `px-3 py-2` → `px-4 py-2.5`

## Declutter

- Remove the footer `<p>` hint at `text-[10px]` ("Enter to send") in `ChatPanel.tsx`.
  The footer keeps the language toggle row.

## Files touched

- `frontend/src/index.css` (body 15→16px)
- `frontend/src/App.tsx` (h1 18→20px; header meta labels →12px)
- `frontend/src/components/ChatPanel.tsx` (messages, composer, chips, empty state,
  message meta, lang toggle, footer hint removal, spacing)
- `frontend/src/components/VizPanel.tsx` (captions, empty-state detail, spacing)
- `frontend/src/components/ConfidenceBadge.tsx` (11→12px)
- `frontend/src/components/ExplainabilityDrawer.tsx` (11→12px, spacing)
- `frontend/src/components/TrajectoryMap.tsx` (overlay xs→13px)

## Verification

- `npm run build` passes (tsc + vite) in `frontend/`.
- Dev server on :5173 restarted (Tailwind JIT reads config once at startup) and
  served CSS shows the new sizes; hard refresh shows visibly larger text in header,
  chat, chips, and labels.
- Live `/health` still `{"status":"ok","db_connected":true}`.

## Out of scope

- Deployment (still blocked on hosting credentials).