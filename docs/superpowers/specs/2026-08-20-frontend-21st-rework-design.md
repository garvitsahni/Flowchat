# FloatChat Frontend — 21st.dev Premium Rework

**Date:** 2026-08-20
**Status:** Approved design
**Scope:** Frontend only. Full app shell + all components. No backend/schema/contract changes.

---

## 1. Goal

Replace the current hand-rolled Tailwind frontend (`frontend/src/`) with highly polished,
animated components in the 21st.dev style. The result must still be a **dark, premium
"deep-sea instrument panel"** experience. User decisions (from brainstorming):

- **Scope:** full app shell + all components.
- **Visual direction:** dark, premium instrument feel — fresh look.
- **Tokens:** drop the current charcoal/terracotta token system; adopt a new cohesive
  shadcn/ui CSS-variable theme.
- **Viz:** swap Plotly charts for animated recharts-based chart cards. Leaflet trajectory
  map is kept (re-skinned) — no good 21st.dev equivalent for an ARGO float path over a
  dark basemap.
- **Approach:** Approach A — curated 21st.dev-style components + shadcn/ui bootstrap.

### Explicilty overridden AGENTS.md rules (flag for the team)
- "Don't introduce ad hoc colors outside the DESIGN.md palette" — **overridden**; the
  DESIGN.md §2 palette is being retired in favor of a fresh shadcn theme.
- "Do not silently swap the visualization library" — **overridden for Plotly**; recharts
  replaces it. Leaflet stays.
- "Do not remove the explainability panel" — **still honored**; the panel is reworked, not
  removed.
- The `/query` response contract (ARCHITECTURE.md §4 / `frontend/src/types.ts`) is
  **unchanged**; only presentation changes. No downstream breakage.

---

## 2. Foundation — shadcn/ui bootstrap + theme

1. Init shadcn/ui in the existing Vite + React 18 + Tailwind v3 project:
   - `components.json` at `frontend/`.
   - `src/lib/utils.ts` exporting `cn()` (clsx + tailwind-merge).
   - `src/components/ui/*` primitives as needed (button, card, badge, accordion, etc.).
2. Replace the current flat tailwind colors (`abyss/current/bio/scan/foam`) with shadcn
   semantic CSS variables (HSL) in `src/index.css`, dark mode default.

### Proposed token direction (deep instrument)
- Background layers: deep ink/slate with subtle blue tint; slightly lighter elevated
  surfaces; hairline borders.
- Primary accent: teal/cyan (oceanographic read).
- Secondary/warning: amber (low-confidence, uncertainty).
- Critical: muted red (errors/refusals only).
- Text: near-white foreground, muted secondary.
- Fonts unchanged: IBM Plex Mono (numbers/labels/IDs) + Inter (body). Keep `font-mono`
  and `font-sans` tailwind keys.

Exact HSL values to be finalized during implementation and tuned visually against `npm run dev`.

---

## 3. Component map

### 3.1 App shell
- Keep the header + chat column + viz column layout in `App.tsx`.
- Wrap the app in a subtle animated background (dotted grid or restrained aurora) using
  the retrieved premium 21st.dev piece or a `motion`-based equivalent.

### 3.2 Header
- Logo: `FloatChat` wordmark, mono, primary accent on "Chat".
- Subtitle: `DEEP-SEA INSTRUMENT PANEL · INDIAN OCEAN`.
- LIVE badge: pulsing dot + `LIVE · float 2900226`.
- Current-language readout (`en · english` / `hi · हिन्दी`), mono, muted — display only.
  The interactive EN/HI control lives in the composer (§3.3), matching today.

### 3.3 Chat panel (`ChatPanel.tsx`)
- Message list: staggered motion entrances (smooth 300–400ms ease-out; no bouncy).
- User bubble: primary-surface chip, right aligned.
- System bubble: elevated surface, primary-accent left border, left aligned (still
  signals "grounded data").
- Composer: auto-growing textarea, animated send button with micro-interaction, EN/HI
  animated segmented control (sliding thumb) inline — the single interactive language
  control.
- Empty state: animated sonar mark, one-line instruction, dataset stats, suggestion chips.
- Loading: **animated typing indicator** replacing the sonar-sweep bar.

### 3.4 Visualization panel (`VizPanel.tsx` + chart cards)
- Chart type → component mapping (data shapes from `chart_data`, unchanged):
  - `depth_profile`: dual-axis (temperature °C / salinity PSU) over inverted depth.
  - `time_series`: animated line chart of monthly mean.
  - `comparison`: animated bar pair (target vs baseline).
  - `trajectory`: **Leaflet** map, re-skinned (token colors, glowing current-position
    marker, dark basemap). 
  - `none` / refusal / insufficient-data: themed state cards.
- Charts built on `recharts` with draw-in animation + themed tooltips, inside styled cards.

### 3.5 Explainability drawer (`ExplainabilityDrawer.tsx`)
- Animated accordion/collapsible ("How I got this").
- Contents: SQL block, float ID chips, readings-excluded count, time range, confidence
  status. Same fields as today.

### 3.6 Confidence badge (`ConfidenceBadge.tsx`)
- Behavior unchanged (renders only when confidence is low). Amber styling re-synced to
  new tokens.

---

## 4. Behavior preserved (no logic changes)

- `types.ts` — unchanged.
- `lib/api.ts` — unchanged (mock via `VITE_USE_MOCK`, real `/query` otherwise).
- `lib/cn.ts` — superseded by shadcn `utils.ts` cn (same contract).
- Language toggle, suggestions, busy/error/refusal handling, confidence + explainability
  data flows — unchanged; presentation only.

---

## 5. Dependencies

- **Remove:** `plotly.js-dist-min`, `@types/plotly.js`.
- **Keep:** `leaflet`, `@types/leaflet`.
- **Add:** shadcn/ui stack (`clsx`, `tailwind-merge`, `class-variance-authority`, radix
  primitives as required by installed components), `motion`, `recharts`, `lucide-react`.

### 21st.dev usage
- Free tier has **1 component-code retrieval remaining** today → use it for the single
  most valuable premium piece (animated background or typing indicator); obtain code via
  `get_component` and adapt.
- All other components are built on shadcn/ui + `motion` in the same 21st.dev style.
- If the user provides `API_KEY_21ST`, additional components can be pulled via
  `npx shadcn@latest add "https://21st.dev/r/..."` during implementation.

---

## 6. Verification

1. Create a git checkpoint before starting (`git add -A && git commit -m "checkpoint: before frontend 21st rework"`).
2. `npm run build` (runs `tsc --noEmit && vite build`) must pass with no type errors.
3. `npm run dev` visual check: dark theme renders, chat round-trips (mock mode), all four
   chart types + refusal/empty states render, EN/HI toggle works, drawer animates.
4. Confirm no `/query` request shape change (compare `api.ts` before/after).

---

## 7. Out of scope

- Backend, schema, prompts, data pipeline.
- The trajectory map library swap (stays Leaflet).
- Authentication, deployment, demo script.