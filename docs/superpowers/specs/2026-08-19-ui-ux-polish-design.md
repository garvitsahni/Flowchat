# FloatChat UI/UX Polish — Blackish Ocean Theme

Date: 2026-08-19
Scope: `frontend/` only — no backend, no API contract changes.

## Goal

Elevate the demo-facing UI using 21st.dev reference components (Agent Chat shell,
Claude-style composer) re-skinned to a **near-black** ocean palette while keeping
the DESIGN.md accent tokens (bio teal, scan amber, flag red, current blue, foam text).

## Palette shift (tokens only, in `tailwind.config.js` + `index.css`)

Move the `abyss` surfaces from dark-navy to **Claude's warm dark charcoal** with a
**terracotta** accent (`#D97757`) and cream text (`#ECECEC`). Accent/warning/error
tokens (`bio`, `scan`, `flag`) keep their roles but `bio` (the primary accent) is now
terracotta. All token *names* and component logic are unchanged — values only.

| Token | Before (ocean) | After (Claude) |
|-------|--------|--------|
| `abyss-950` (page bg) | `#05141F` | `#1F1E1D` |
| `abyss-900` (panel)   | `#0A1F2E` | `#262624` |
| `abyss-800` (raised)  | `#122C3D` | `#30302E` |
| `current-500`/`300`   | `#1B4F72`/`#3A7CA5` | `#3F3D3B`/`#8C8A86` |
| `bio-400`/`300`       | `#2DE1C2`/`#6BF0D9` | `#D97757`/`#E68A6E` |
| `scan-500`, `flag-500`, `foam-*` | unchanged roles | kept (amber warning, red error, cream text) |

Mirror the new panel color in Plotly (`paper_bgcolor`/`plot_bgcolor` in `VizPanel.tsx`)
and the series colors (`TEAL`→terracotta, `MUTED`→warm gray) so charts blend with the
Claude panels. Same for the Leaflet map line/markers in `TrajectoryMap.tsx`.

## Component changes

1. **Composer (ChatPanel.tsx)** — Claude-style rounded container: `bg-abyss-800`,
   subtle ring, teal ring on focus-within; auto-resizing textarea (Enter sends,
   Shift+Enter newline); circular send button that lights up when text present,
   disabled while busy. No attachments. Language toggle + "Enter to send" hint in a
   slim footer row under the composer.

2. **Empty state (ChatPanel.tsx)** — centered column: short title, the dataset-scope
   line (float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles), then
   the four demo questions as pill quick-action chips that fill the query on click.

3. **Message list (ChatPanel.tsx)** — Agent Chat structure, re-tokened:
   - user: right-aligned rounded bubble, `current`-tinted
   - assistant: left card with colored left-accent — `bio` (answer) / `scan`
     (refusal) / `flag` (error)
   - keep ConfidenceBadge + ExplainabilityDrawer intact
   - busy: keep the DESIGN.md `sonar-sweep` typing indicator (rule: no generic spinner)

4. **Viz panel (VizPanel.tsx)** — richer empty state (inline sonar icon + scope line +
   one suggestion chip). Plotly/Leaflet rendering untouched. Existing no_data/unsafe
   cards kept.

5. **Header (App.tsx)** — add `LIVE` pulsing dot + keep lang readout.

6. **Housekeeping** — add tiny `cn()` helper (`src/lib/cn.ts`) + inline SVGs only.
   No new npm dependencies (no `lucide-react`/`clsx`/`tailwind-merge`).

## Explicitly out of scope

- Plotly, Leaflet, the explainability drawer contract
- Any backend/schema/prompt change
- New color values outside the palette table above
- File/attachment upload in the composer

## Verification

- `npm run build` (tsc + vite) passes
- Manual: dev server on 5173 — empty state, chips, composer, a real query
  (time series + depth profile), refusal + error states render correctly
- Commit as `fe: blackish ocean theme + UI polish (21st-inspired composer/messages)`