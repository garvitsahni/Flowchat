# Instrument Panel Redesign - Design Spec

- Date: 2026-08-20
- Status: Approved (user: "approve", incl. flags a/b)
- Area: frontend

## Objective

Redesign the FloatChat main interface into a premium **deep-sea instrument
control panel / scientific oceanographic research workstation** - not a generic
SaaS dashboard. Preserve FloatChat branding, the black/cyan color language,
compact technical typography, and the mission-control aesthetic while making the
UI more polished, modern, readable, and information-dense.

Approach: **A - instrument rework on recharts** (approved). Recharts stays as the
charting library (existing dependency, matches the locked §4 response contract,
respects the AGENTS.md "do not silently swap the visualization library" rule).
All new presentation is built on top of it.

## Current State (Context)

- `frontend/src/App.tsx` - AuroraBackground + Particles + marquee telemetry strip
  + header + two-column ChatPanel/VizPanel + Toaster + TooltipProvider.
- `ChatPanel.tsx` - message list (user right bubble / system card), ConfidenceBadge,
  ExplainabilityDrawer, PromptInput (ai-chat-input), empty-state suggestions, busy
  typing indicator, toast on error. Uses `ask()` -> mock or live `/query`.
- `VizPanel.tsx` - MagicCard wrapper; renders DepthProfileChart / TimeSeriesChart /
  ComparisonChart / TrajectoryMap per `chart_type`; loading skeleton; refusal and
  insufficient-data state cards.
- `types.ts` - **locked §4 contract**: `QueryResponse` (`answer_text`, `language`,
  `chart_type`, `chart_data: Record<string, unknown>`, `confidence`, `confidence_note`,
  `refusal_reason?`, `explainability`). Do not change this shape.
- `lib/mock.ts` - 7 canned mock responses cycled on each ask; the `TIME_SERIES` entry
  already contains the redesign example (20.7°C -> 27.4°C, low confidence,
  months 2003-01..2003-08, region Bay of Bengal).
- `components/ui/*` - shadcn + magic-ui set (sonner, tooltip, skeleton, tabs,
  number-ticker, marquee, border-beam, blur-fade, magic-card, particles,
  aurora-background, typing-indicator, ai-chat-input).
- `components/charts/StockChart.tsx` + `demo/*` - AMZN demo (commit `80abf04`),
  superseded by this redesign (see Cleanup).

## Visual Language

- Background `#080909`; panels `#0D0F0F` (deep) / `#111313` (raised); hairline dark
  gray borders (~`#1E2020`); off-white text; muted gray secondary.
- Primary accent: ocean cyan/teal (existing `--primary`, hsl 174°). Warning: amber
  (existing `--warning`). Success/live: green. Cyan glow/emphasis only on important
  interactive elements.
- Avoid excessive gradients, glassmorphism, cards, shadows, rounded SaaS components.
- Typography: sans-serif for normal UI; IBM Plex Mono for telemetry, metadata,
  measurements, and system labels (existing `font-mono`).
- Drop animated Particles + Marquee strip; replace heavy aurora with one very subtle
  static radial vignette. Remove backdrop-blur/glass treatments.

## Header + Layout

- Compact header, thin bottom border. Left: `FloatChat` wordmark + label
  `DEEP-SEA INSTRUMENT PANEL · INDIAN OCEAN`. Right: pulsing green `● LIVE`,
  `float 2900226`, existing LanguageToggle, small settings icon (opens a minimal
  popover with dataset/demo status). Telemetry that lived in the marquee moves into
  DataContext + the LIVE tooltip.
- Two-column workspace: desktop `lg:grid-cols-[48%_52%]` (viz dominant), tablet
  ~45/55, mobile stacked in order: header, user query, AI answer, data context,
  chart, related questions, command input. Chart stays horizontally usable on mobile.

## Left - AI Research Workspace

- **Seeded on load** with the example Q&A (user bubble right-aligned, cyan):
  "How did temperature change in the Bay of Bengal in 2003?" followed by the AI
  AnswerCard. The seed renders the existing `TIME_SERIES` mock response (no network
  call) as the initial conversation + initial VizPanel response.
- `AnswerCard` renders three stacked units (not one blob):
  1. **Answer** - the sentence with numeric values highlighted brighter, e.g.
     "Temperature in Bay of Bengal rose from **20.7°C** (2003-01) to **27.4°C**
     (2003-08)."
  2. **ConfidenceBadge** - compact amber mono metadata styled as scientific
     data-quality metadata: `LOW CONFIDENCE` + note ("limited float coverage and a
     high proportion of readings failed quality checks"), pulsing amber dot, thin
     bordered. Not a generic warning alert.
  3. **EvidencePanel** - expandable `⌄ How I got this` row (evolves
     ExplainabilityDrawer animation): data source, # observations, date range,
     region, filtering/quality checks, calculation used, plus SQL line.
- Below the answer: **DataContext** - 4 compact telemetry blocks:
  REGION Bay of Bengal / PERIOD 2003-01 -> 2003-08 / OBSERVATIONS 1,284 /
  QUALITY 72% usable, plus a small **DataQuality** chip (`LOW`, amber).
- **RelatedQueries** - 4 clickable "instrument commands" (mono, bracketed prefix,
  subtle hover), wired to actually ask: "Show monthly temperature trend",
  "Compare 2002 vs 2003", "Which month was hottest?", "Show float coverage".
- Bottom: floating **CommandInput** - command-style, placeholder
  "Ask about floats, regions, or measurements...", send/execute icon, optional
  `⌘ Enter to analyze` hint above. Sharp minimal styling, cyan focus accent.
- New queries append below (existing `ask()` flow preserved). Busy -> typing
  indicator. Errors -> toast + inline error. Refusals / insufficient data ->
  graceful states (restyled to the new structure). Suggestion chips in the empty
  state are removed (boot is seeded; new empty state not needed).

## Right - Visualization Workspace

- **ScientificChart** panel: title `MONTHLY MEAN` (top-left), top-right metadata
  `Bay of Bengal`, status line `● 8 observations` + DataQuality chip.
- Recharts line chart: subtle dotted `CartesianGrid` (`strokeDasharray` 2 4),
  Y-axis ticks 0/7/14/21/28 °C, X-axis `01..08` (months), smoothed cyan
  `monotone` line (strokeWidth ~2), small cyan circular point markers, activeDot
  highlight, crosshair cursor (vertical dashed line). Custom floating dark tooltip
  (sharp corners, thin cyan accent bar) showing: label `2003-08`, rows
  Temperature `27.4°C` / Observations `184` / Quality `86%`.
- **ChartControls** below the chart: metric segmented control
  `TEMPERATURE | SALINITY | PRESSURE | OXYGEN` (single active), scale
  `MONTHLY | YEARLY`, and `EXPORT`. Subtle, mono, instrument style.
- Metrics genuinely switch the chart via a clearly-marked **client-side mock demo
  dataset** in `lib/demo.ts` (temperature mirrors the real float pattern; the rest
  are labeled demo series with the same month/observation/quality shape). YEARLY
  shows annual-mean series (2002-2004). EXPORT downloads the current series as CSV
  (blob download). Metric/scale state resets on each new answer.

## Behavior, Motion, Responsiveness

- Chart line draws on load; points fade in; tooltip tracks cursor; chat response
  fades/slides in; LIVE indicator pulses gently; EvidencePanel animates open;
  metric switch cross-fades / re-animates. All subtle, framer-motion where not
  handled by recharts.

## Code Plan, Contracts, Cleanup

- New components: `Header`, `ChatMessage`, `AnswerCard`, `ConfidenceBadge`,
  `EvidencePanel`, `DataContext`, `RelatedQueries`, `DataQuality`, `CommandInput`,
  `ScientificChart`, `ChartControls`, plus `lib/demo.ts`. Rework `ChatPanel` and
  `VizPanel`; `App` stays the orchestrator.
- **Locked §4 response contract unchanged** - all demo augmentations (per-month
  observations/quality, salinity/pressure/oxygen series, yearly series, CSV export)
  live client-side in `lib/demo.ts`, clearly marked MOCK, keyed by region/period.
- **Cleanup (approved):** remove the `#/demo` route + `DemoHub`, `PromptInputDemo`,
  `StockChartDemo`, and `components/charts/StockChart.tsx`. ScientificChart inherits
  the premium patterns from StockChart (deterministic seeded series where needed).
- Keep: `ask()` mock/live switch (`VITE_USE_MOCK`), Toaster, TooltipProvider,
  existing theme tokens (tuned), LanguageToggle, refusal/insufficient-data states.

## Verification

- No test/lint scripts in this repo (AGENTS.md). Verification = `npm run build`
  (tsc --noEmit + vite build) + headless Edge DOM dump on a fresh dev load proving
  the seeded conversation + chart render + no console errors, plus a manual
  interaction pass (tooltip, metric switch, export, evidence expand).
- Git checkpoint before the structural change per AGENTS.md.

## Out of Scope

- Backend / schema / prompt changes. No auth. No new dataset coverage. No
  persistence of conversation. Settings popover is informational only.