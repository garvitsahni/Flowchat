# FloatChat — Design Document
**Design concept: "The Deep-Sea Instrument Panel"**

---

## 1. Design Philosophy

FloatChat should feel like a **scientific instrument, not a consumer chatbot**. The
visual language borrows from oceanographic research vessels, sonar displays, and depth
gauges — precise, data-dense, calm, and trustworthy. Avoid generic "AI chatbot" tropes
(purple gradients, bubbly rounded everything, glowing sparkle icons). This is a tool a
scientist would actually trust to hand them a number.

Every screen should communicate: **depth, precision, and quiet confidence.**

---

## 2. Design Tokens

### 2.1 Color Palette — "Abyssal"

| Token | Hex | Use |
|---|---|---|
| `--abyss-950` | `#05141F` | App background (deep base) |
| `--abyss-900` | `#0A1F2E` | Panel/card background |
| `--abyss-800` | `#122C3D` | Elevated surfaces, chat bubbles (system) |
| `--current-500` | `#1B4F72` | Primary structural blue (borders, dividers) |
| `--current-300` | `#3A7CA5` | Secondary accents, inactive states |
| `--bioluminescent-400` | `#2DE1C2` | Primary accent — CTAs, active states, links |
| `--bioluminescent-300` | `#6BF0D9` | Hover/glow states, chart highlight lines |
| `--surface-scan-500` | `#F4A259` | Warning / low-confidence indicator (amber, not red — calmer) |
| `--flag-critical-500` | `#E8544E` | Errors, out-of-scope refusals only — used sparingly |
| `--foam-50` | `#EAF6F6` | Primary text on dark backgrounds |
| `--foam-200` | `#C4D8DA` | Secondary/muted text |
| `--sonar-grid` | `rgba(45, 225, 194, 0.08)` | Subtle grid-line overlays on charts/maps |

**Rule:** bioluminescent teal is the *only* saturated accent color. Everything else stays
in the deep-blue/foam range. This restraint is what makes it read as premium rather than
"hackathon default Tailwind palette."

### 2.2 Typography

| Role | Font | Notes |
|---|---|---|
| Headings / data labels | **IBM Plex Mono** | Instrument-panel feel for numbers, coordinates, float IDs — monospace reinforces "precision" |
| Body / chat text | **Inter** | Clean, highly legible, Devanagari-compatible pairing available (Inter + Noto Sans for Hindi) |
| Hindi text | **Noto Sans Devanagari** | Pair alongside Inter for vernacular mode |

- Numbers (depths, temperatures, coordinates) are **always** rendered in the mono font,
  even inline in body text — this single choice does a lot of the "premium scientific tool"
  work on its own.
- Base size 15-16px body, generous line-height (1.6) for chat readability.

### 2.3 Spacing & Layout

- 8px base grid
- Generous whitespace in chat panel — avoid cramming; this is a "control room," not a
  messaging app
- Max content width for chat column: ~720px, centered, with visualization panel docked
  right (desktop) or below (mobile/narrow)

### 2.4 Iconography & Motion

- Line icons only, 1.5px stroke, no filled/bubbly icons
- Motion: subtle, slow (300-400ms ease-out) — think sonar ping, not bouncy pop-in
- Loading state: a slow-pulsing depth-gauge or radar-sweep animation instead of a generic spinner — reinforces the theme and doubles as a nice demo beat

---

## 3. Core Screen Components

### 3.1 Chat Panel
- User messages: right-aligned, `--current-500` background, `--foam-50` text
- System (FloatChat) messages: left-aligned, `--abyss-800` background, subtle
  `--bioluminescent-400` left border accent (1-2px) — signals "this is grounded data,"
  not just chat
- Language toggle (EN/HI) as a small pill switch, top-right of input bar

### 3.2 Visualization Panel
- Docked panel that updates per-query (doesn't scroll away with chat history)
- Chart background: `--abyss-900`, gridlines in `--sonar-grid`
- Depth-profile chart: y-axis inverted (0 at top, deeper values downward) — matches how
  oceanographers actually read depth
- Trajectory map: dark basemap (CartoDB Dark Matter or similar), float path in
  `--bioluminescent-400`, current position marker with a soft pulsing glow
- Comparison charts: current period in `--bioluminescent-400`, historical baseline in
  `--current-300` (dashed line) — clear visual "this vs. that" without needing a legend

### 3.3 Explainability Drawer ("How I got this")
- Collapsed by default, expandable via a small `[ ⌄ How I got this ]` link under every answer
- Contents styled like a technical readout: monospace SQL block, float ID chips, a small
  stat row (floats used / readings excluded / confidence)
- This panel is a **differentiator feature** — give it real visual craft, not an
  afterthought `<pre>` tag. It's one of the things judges will remember.

### 3.4 Confidence Indicator
- Small badge next to any answer with sparse data: amber (`--surface-scan-500`) dot +
  "Low confidence — limited float coverage" microcopy
- High-confidence answers: no badge at all (absence of a warning is itself the signal —
  don't clutter confident answers with a green checkmark everywhere)

---

## 4. Building with 21st.dev / Magic MCP

When prompting 21st.dev (Magic MCP) for components, feed it this document's tokens
directly rather than describing colors loosely. Suggested prompt pattern per component:

```
Build a [component] using this palette: background #05141F, panel #0A1F2E,
accent #2DE1C2 (use sparingly, only for active/CTA states), text #EAF6F6.
Typography: IBM Plex Mono for numbers/labels, Inter for body text.
Style: precise, data-dense scientific instrument panel — NOT a bubbly
consumer chatbot. 1.5px line icons only. Motion should be slow and calm
(300-400ms ease-out), no bouncy easing.
```

Build order (matches frontend dev split in `PHASES.md`):
1. Chat shell + message bubbles (Frontend Dev #1)
2. Input bar + language toggle (Frontend Dev #1)
3. Chart container + depth-profile chart (Frontend Dev #2)
4. Trajectory map container (Frontend Dev #2)
5. Explainability drawer (either, once contract is stable)
6. Confidence badge (small, do last)

---

## 5. What to Avoid

- Purple/violet AI-generic gradients
- Rounded bubble avatars with sparkle/star icons
- Generic spinner loading states
- Red for anything except true out-of-scope refusals (amber for uncertainty keeps the
  tone calm and scientific rather than alarming)
- Overly playful copy — the tone throughout is precise and calm, not chatty
