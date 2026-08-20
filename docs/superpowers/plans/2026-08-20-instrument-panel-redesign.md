# Instrument Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rebuild the FloatChat main interface into a premium deep-sea instrument control panel / scientific oceanographic research workstation (seeded example conversation, structured answer/evidence/data-context, scientific recharts chart with crosshair tooltip + working metric/scale/export controls).

**Architecture:** Presentational component library (`components/chat/*`, `components/charts/*`, `Header`) on top of the existing `App` -> `ChatPanel`/`VizPanel` data flow. The locked §4 `QueryResponse` contract and the `ask()` mock/live switch stay untouched; all demo-only augmentations (per-month observations/quality, salinity/pressure/oxygen series, yearly series, CSV export) live in a clearly-marked client-side `lib/demo.ts`.

**Tech Stack:** React 18 + TS (strict) + Vite 6 + Tailwind 3.4 + recharts 3 + framer-motion 13 + lucide-react + sonner. No test runner in this repo.

## Global Constraints

- Locked §4 contract: `QueryResponse` shape in `frontend/src/types.ts` MUST NOT change.
- Do not swap the visualization library (recharts stays). Do not add auth. Do not add new dataset coverage.
- All demo-only data is client-side in `lib/demo.ts`, clearly marked MOCK in a code comment.
- Panels use `#0D0F0F` / `#111313`; background `#080909`; hairline borders; cyan primary accent only for important interactive elements; amber for quality flags; IBM Plex Mono for all telemetry/labels/measurements.
- No glassmorphism/backdrop-blur/gradient-heavy cards. Sharp corners, thin borders, dense instrument layout.
- Every numeric answer value is highlighted brighter; every number in the UI traces back to the seeded/demo dataset (never invented ad hoc).
- Refusal / insufficient-data / error paths must still return graceful states (no unattributed numbers).
- Commit style: short imperative, `fe:` prefix. Git checkpoint already created (`393ad5f` spec commit).

## Verification (no test runner)

Every task ends with, at minimum: `npm run build` from `frontend/` (runs `tsc --noEmit && vite build`), must pass clean. Visual tasks additionally verified with a headless Edge DOM dump of a fresh dev load (server on port 5199) confirming expected nodes render with no console errors:

```powershell
$dom = & "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --dump-dom "http://localhost:5199/" 2>&1 | Where-Object { $_ -is [string] }; $dom = $dom -join "`n"; "bytes: $($dom.Length)"; $dom -match 'ROOT'  # plus per-task expected markers
```

Dev server (detached, log `frontend/dev5199.log`): `Start-Process cmd.exe -ArgumentList "/c","npm run dev -- --port 5199 --strictPort > dev5199.log 2>&1" -WorkingDirectory "C:\Users\Garvi\Desktop\Projects\FloatChat\frontend" -WindowStyle Hidden`

---
## File Structure

**Create:**
- `frontend/src/lib/demo.ts` — mock demo dataset + CSV builder (Task 1)
- `frontend/src/components/chat/DataQuality.tsx` — reusable HIGH/MEDIUM/LOW chip (Task 2)
- `frontend/src/components/chat/ConfidenceBadge.tsx` — amber QC-metadata chip (Task 2)
- `frontend/src/components/chat/EvidencePanel.tsx` — expandable "How I got this" (Task 2)
- `frontend/src/components/chat/DataContext.tsx` — 4 telemetry blocks (Task 2)
- `frontend/src/components/chat/RelatedQueries.tsx` — instrument-command suggestions (Task 2)
- `frontend/src/components/chat/AnswerCard.tsx` — answer + confidence + evidence composition (Task 2)
- `frontend/src/components/chat/ChatMessage.tsx` — user bubble / AnswerCard row (Task 2)
- `frontend/src/components/chat/CommandInput.tsx` — command-style input with Cmd+Enter hint (Task 3)
- `frontend/src/components/Header.tsx` — compact header + settings popover (Task 4)
- `frontend/src/components/charts/ScientificChart.tsx` — recharts instrument chart + tooltip + crosshair (Task 5)
- `frontend/src/components/charts/ChartControls.tsx` — metric/scale/export segmented controls (Task 5)

**Modify:**
- `frontend/src/lib/mock.ts` — export `TIME_SERIES`; trim its `answer_text` (Task 1)
- `frontend/src/components/ChatPanel.tsx` — seeded conversation, new chat components, CommandInput (Task 6)
- `frontend/src/components/VizPanel.tsx` — ScientificChart for time_series, restyle panels/states (Task 7)
- `frontend/src/App.tsx` — Header, 48/52 grid layout, remove aurora/particles/marquee + demo routes (Task 8)
- `frontend/src/index.css` — token tuning (`--background` 0 0% 3%), keep `sonar-pulse` (Task 8)
- `frontend/tailwind.config.js` — remove marquee keyframes/animation (Task 9)

**Delete (after their consumers are reworked):**
- `frontend/src/components/ConfidenceBadge.tsx`, `ExplainabilityDrawer.tsx` (Task 6)
- `frontend/src/components/charts/TimeSeriesChart.tsx`, `ChartTooltip.tsx`, `StockChart.tsx` (Task 9)
- `frontend/src/demo/DemoHub.tsx`, `PromptInputDemo.tsx`, `StockChartDemo.tsx` (Task 9)
- `frontend/src/components/ui/aurora-background.tsx`, `particles.tsx`, `marquee.tsx`, `number-ticker.tsx`, `border-beam.tsx`, `magic-card.tsx`, `blur-fade.tsx`, `ai-chat-input.tsx` (Task 9)
- `frontend/src/components/ui/segmented-control.tsx` + `typing-indicator.tsx` ONLY if unreferenced after rework (check in Task 9; typing-indicator is expected to stay for the busy state)

**Unchanged:** `types.ts`, `lib/api.ts`, `lib/utils.ts`, `LanguageToggle.tsx`, `TrajectoryMap.tsx`, `DepthProfileChart.tsx`, `ComparisonChart.tsx`, `components/ui/{sonner,tooltip,skeleton,tabs}.tsx`.

---
### Task 1: Mock demo dataset + CSV export (`lib/demo.ts`)

**Files:**
- Create: `frontend/src/lib/demo.ts`
- Modify: `frontend/src/lib/mock.ts` (export `TIME_SERIES`, trim answer_text)

**Interfaces:**
- Produces: `DemoMetric`, `DemoScale`, `DemoPoint`, `DEMO_METRICS`, `getRegionContext`, `exportCsv` — consumed by Tasks 2, 5, 6, 7.

- [x] **Step 1:** Create `frontend/src/lib/demo.ts` with this exact content:

```ts
// MOCK: illustrative demo series for UI demonstration only.
// Temperature monthly values mirror the real float 2900226 TIME_SERIES response
// values; salinity/pressure/oxygen and yearly series are plausible placeholder
// series (NOT real measurements) so the chart controls are demonstrable.

export type DemoMetric = "temperature" | "salinity" | "pressure" | "oxygen";
export type DemoScale = "monthly" | "yearly";

export interface DemoPoint {
  period: string; // "2003-01" | "2002" | ...
  value: number;
  observations: number;
  quality: number; // 0-100 usable %
}

export interface DemoMetricConfig {
  label: string;
  unit: string;
  color: string;
  monthly: DemoPoint[];
  yearly: DemoPoint[];
  domain: [number, number];
  ticks: number[];
}

const MONTHLY_TEMP: DemoPoint[] = [
  { period: "2003-01", value: 20.7, observations: 152, quality: 66 },
  { period: "2003-02", value: 21.4, observations: 148, quality: 68 },
  { period: "2003-03", value: 22.8, observations: 161, quality: 70 },
  { period: "2003-04", value: 24.1, observations: 157, quality: 71 },
  { period: "2003-05", value: 25.6, observations: 169, quality: 69 },
  { period: "2003-06", value: 26.3, observations: 163, quality: 70 },
  { period: "2003-07", value: 27.0, observations: 150, quality: 72 },
  { period: "2003-08", value: 27.4, observations: 184, quality: 86 },
];

const SALINITY_MONTHLY = [33.2, 33.4, 33.6, 33.1, 32.8, 32.5, 32.2, 31.9];
const PRESSURE_MONTHLY = [452, 455, 448, 458, 462, 460, 454, 449];
const OXYGEN_MONTHLY = [195, 192, 188, 181, 175, 169, 164, 158];

const YEAR_LABELS = ["2002", "2003", "2004"];

const withMeta = (values: number[], observations: number[], quality: number[]): DemoPoint[] =>
  values.map((v, i) => ({
    period: MONTHLY_TEMP[i].period,
    value: v,
    observations: observations[i],
    quality: quality[i],
  }));

const YEARLY_TEMP: DemoPoint[] = [
  { period: "2002", value: 23.1, observations: 1210, quality: 70 },
  { period: "2003", value: 24.3, observations: 1284, quality: 72 },
  { period: "2004", value: 24.9, observations: 902, quality: 74 },
];

const yearlyFor = (_base: number, values: number[], obs: number[]): DemoPoint[] =>
  values.map((v, i) => ({
    period: YEAR_LABELS[i],
    value: v,
    observations: obs[i],
    quality: 70 + i * 2,
  }));

export const DEMO_METRICS: Record<DemoMetric, DemoMetricConfig> = {
  temperature: {
    label: "Temperature",
    unit: "\u00B0C",
    color: "#2dd4bf",
    monthly: MONTHLY_TEMP,
    yearly: YEARLY_TEMP,
    domain: [0, 28],
    ticks: [0, 7, 14, 21, 28],
  },
  salinity: {
    label: "Salinity",
    unit: "PSU",
    color: "#4da3ff",
    monthly: withMeta(SALINITY_MONTHLY, MONTHLY_TEMP.map((p) => p.observations), MONTHLY_TEMP.map((p) => p.quality)),
    yearly: yearlyFor(33.0, [33.0, 33.2, 33.1], [1210, 1284, 902]),
    domain: [30, 36],
    ticks: [30, 32, 34, 36],
  },
  pressure: {
    label: "Pressure",
    unit: "dbar",
    color: "#d9a441",
    monthly: withMeta(PRESSURE_MONTHLY, MONTHLY_TEMP.map((p) => p.observations), MONTHLY_TEMP.map((p) => p.quality)),
    yearly: yearlyFor(452, [452, 455, 451], [1210, 1284, 902]),
    domain: [440, 470],
    ticks: [440, 450, 460, 470],
  },
  oxygen: {
    label: "Oxygen",
    unit: "\u00B5mol/kg",
    color: "#20d98a",
    monthly: withMeta(OXYGEN_MONTHLY, MONTHLY_TEMP.map((p) => p.observations), MONTHLY_TEMP.map((p) => p.quality)),
    yearly: yearlyFor(185, [185, 172, 168], [1210, 1284, 902]),
    domain: [150, 200],
    ticks: [150, 170, 190],
  },
};

export function getRegionContext(
  region: string
): { observations: number; quality: number } | undefined {
  if (region !== "Bay of Bengal") return undefined;
  const monthly = DEMO_METRICS.temperature.monthly;
  const observations = monthly.reduce((s, p) => s + p.observations, 0);
  const quality = Math.round(
    monthly.reduce((s, p) => s + p.quality, 0) / monthly.length
  );
  return { observations, quality };
}

export function exportCsv(metric: DemoMetric, scale: DemoScale): string {
  const cfg = DEMO_METRICS[metric];
  const points = cfg[scale];
  const header = `metric,unit,scale,period,value,observations,quality_pct`;
  const rows = points.map(
    (p) =>
      `${cfg.label},${cfg.unit},${scale},${p.period},${p.value},${p.observations},${p.quality}`
  );
  return [header, ...rows].join("\n");
}
```

- [x] **Step 2:** Modify `frontend/src/lib/mock.ts`: add `export` to the `TIME_SERIES` const, and change its `answer_text` to:
  `"Temperature in Bay of Bengal rose from 20.7\u00B0C (2003-01) to 27.4\u00B0C (2003-08)."` (drop the trailing " Limited float coverage." — that context moved to the ConfidenceBadge note).

- [x] **Step 3:** Verify: `npm run build` from `frontend/` — must pass tsc + vite clean.

- [x] **Step 4:** Commit: `git add frontend/src/lib/demo.ts frontend/src/lib/mock.ts` then `git commit -m "fe: add demo dataset and csv export"`
### Task 2: Chat presentational components

**Files:**
- Create: `frontend/src/components/chat/DataQuality.tsx`, `ConfidenceBadge.tsx`, `EvidencePanel.tsx`, `DataContext.tsx`, `RelatedQueries.tsx`, `AnswerCard.tsx`, `ChatMessage.tsx`

**Interfaces:**
- Consumes: `getRegionContext` from `lib/demo.ts` (Task 1), `QueryResponse`/`Confidence`/`Explainability` from `types.ts`, `cn` from `lib/utils.ts`.
- Produces: `Message` type + `ChatMessage` (consumed by Task 6); `AnswerCard`, `DataContext`, `RelatedQueries`, `ConfidenceBadge`, `DataQuality`, `EvidencePanel` (consumed by Task 6).

- [x] **Step 1:** Create `frontend/src/components/chat/DataQuality.tsx`:

```tsx
import { cn } from "../../lib/utils";

const STYLES = {
  high: { dot: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-400/30" },
  medium: { dot: "bg-cyan-400", text: "text-cyan-300", border: "border-cyan-400/30" },
  low: { dot: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
} as const;

export function DataQuality({ level }: { level: "high" | "medium" | "low" }) {
  const s = STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]",
        s.border,
        s.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {level}
    </span>
  );
}
```

- [x] **Step 2:** Create `frontend/src/components/chat/ConfidenceBadge.tsx`:

```tsx
import type { Confidence } from "../../types";
import { cn } from "../../lib/utils";

export function ConfidenceBadge({ confidence, note }: { confidence: Confidence; note: string }) {
  const low = confidence === "low";
  return (
    <div
      className={cn(
        "flex items-start gap-2 border px-2.5 py-1.5",
        low ? "border-amber-400/30 bg-amber-400/5" : "border-emerald-400/30 bg-emerald-400/5"
      )}
    >
      <span className={cn("mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full", low ? "bg-amber-400 sonar-pulse" : "bg-emerald-400")} />
      <div className="min-w-0">
        <div className={cn("font-mono text-[10px] font-semibold uppercase tracking-[0.2em]", low ? "text-amber-400" : "text-emerald-400")}>
          {low ? "Low confidence" : "High confidence"}
        </div>
        {note ? <div className="mt-0.5 font-mono text-[11px] leading-snug text-muted-foreground">{note}</div> : null}
      </div>
    </div>
  );
}
```

- [x] **Step 3:** Create `frontend/src/components/chat/EvidencePanel.tsx`:

```tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Explainability } from "../../types";

export function EvidencePanel({
  info,
  region,
  observations,
  quality,
  calculation,
}: {
  info: Explainability;
  region?: string;
  observations?: number;
  quality?: number;
  calculation?: string;
}) {
  const [open, setOpen] = useState(false);
  const rows: [string, string][] = [
    ["data source", info.floats_used.length ? `ARGO float(s): ${info.floats_used.join(", ")}` : "no float attributed"],
    ...(observations ? ([[ "observations", observations.toLocaleString() ]] as [string, string][]) : []),
    ["date range", info.time_range_queried || "\u2014"],
    ...(region ? ([[ "region", region ]] as [string, string][]) : []),
    ["quality checks", `${info.qc_excluded_count.toLocaleString()} readings excluded (QC flag 4 at ingestion)`],
    ...(calculation ? ([[ "calculation", calculation ]] as [string, string][]) : []),
    ...(quality ? ([[ "usable readings", `${quality}%` ]] as [string, string][]) : []),
  ];
  return (
    <div className="mt-3 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="text-primary">{"\u2304"}</span>
        {open ? "How I got this \u2014 hide" : "How I got this"}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="inline-block">
          <ChevronDown size={12} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 border border-border bg-[#0D0F0F]">
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 px-3 py-2.5 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="font-mono text-xs">
                    <span className="mr-2 text-muted-foreground/60">{k}:</span>
                    <span className="text-foreground">{v}</span>
                  </div>
                ))}
              </div>
              {info.sql && (
                <pre className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">{info.sql}</pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [x] **Step 4:** Create `frontend/src/components/chat/DataContext.tsx`:

```tsx
function Block({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-border bg-[#0D0F0F] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">{k}</div>
      <div className="mt-0.5 font-mono text-[13px] text-foreground">{v}</div>
    </div>
  );
}

export function DataContext({
  region,
  period,
  observations,
  quality,
}: {
  region?: string;
  period?: string;
  observations?: number;
  quality?: number;
}) {
  const blocks: { k: string; v: string }[] = [
    { k: "region", v: region ?? "\u2014" },
    { k: "period", v: period ?? "\u2014" },
    ...(observations ? [{ k: "observations", v: observations.toLocaleString() }] : []),
    ...(quality ? [{ k: "quality", v: `${quality}% usable` }] : []),
  ];
  return (
    <section className="mt-3">
      <h3 className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">Data Context</h3>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {blocks.map((b) => (
          <Block key={b.k} {...b} />
        ))}
      </div>
    </section>
  );
}
```

- [x] **Step 5:** Create `frontend/src/components/chat/RelatedQueries.tsx`:

```tsx
const QUERIES = [
  "Show monthly temperature trend",
  "Compare 2002 vs 2003",
  "Which month was hottest?",
  "Show float coverage",
];

export function RelatedQueries({
  onSelect,
  disabled,
}: {
  onSelect: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="mt-3">
      <h3 className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">Related Queries</h3>
      <div className="flex flex-col items-start gap-0.5">
        {QUERIES.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="group flex items-center gap-2 px-1 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
          >
            <span className="text-muted-foreground/40 transition-colors group-hover:text-primary/60">{String(i + 1).padStart(2, "0")}</span>
            <span className="border-b border-transparent transition-colors group-hover:border-primary/40">{q}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [x] **Step 6:** Create `frontend/src/components/chat/AnswerCard.tsx`:

```tsx
import type { QueryResponse } from "../../types";
import { getRegionContext } from "../../lib/demo";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DataContext } from "./DataContext";
import { EvidencePanel } from "./EvidencePanel";

function calcLabel(response: QueryResponse): string {
  switch (response.chart_type) {
    case "time_series": return "monthly mean of temperature over valid readings";
    case "depth_profile": return "mean over all valid depth levels";
    case "comparison": return "annual mean vs baseline";
    case "trajectory": return "surface position tracking";
    default: return "aggregation over valid readings";
  }
}

function highlightNumbers(text: string): (string | JSX.Element)[] {
  return text.split(/(\d+(?:\.\d+)?(?:\u00B0C|%| PSU| dbar| \u00B5mol\/kg)?)/g).map((part, i) =>
    /\d/.test(part) ? (
      <span key={i} className="font-semibold text-primary">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function AnswerCard({ text, response }: { text: string; response: QueryResponse }) {
  const region = (response.chart_data.region as string | undefined) ?? undefined;
  const months = response.chart_data.months as string[] | undefined;
  const period =
    (response.chart_data.period as string | undefined) ??
    (months && months.length >= 2 ? `${months[0]} \u2192 ${months[months.length - 1]}` : undefined);
  const ctx = getRegionContext(region ?? "");
  return (
    <article className="w-full max-w-[92%]">
      <div className="border border-border bg-[#111313]">
        <p className="px-3.5 py-3 text-[15px] leading-relaxed text-foreground">{highlightNumbers(text)}</p>
        <div className="px-3.5 pb-3">
          <ConfidenceBadge confidence={response.confidence} note={response.confidence_note} />
        </div>
        <div className="border-t border-border px-3.5 py-2.5">
          <DataContext
            region={region}
            period={period}
            observations={ctx?.observations}
            quality={ctx?.quality}
          />
          <EvidencePanel
            info={response.explainability}
            region={region}
            observations={ctx?.observations}
            quality={ctx?.quality}
            calculation={calcLabel(response)}
          />
        </div>
      </div>
    </article>
  );
}
```

- [x] **Step 7:** Create `frontend/src/components/chat/ChatMessage.tsx` (defines the shared `Message` type):

```tsx
import { motion } from "framer-motion";
import type { QueryResponse } from "../../types";
import { AnswerCard } from "./AnswerCard";

export interface Message {
  role: "user" | "system";
  text: string;
  response?: QueryResponse;
  kind?: "error" | "refusal";
}

const ROW_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function ChatMessage({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-end">
        <div className="max-w-[80%] rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-2 text-[15px] leading-relaxed text-foreground">
          {message.text}
        </div>
      </motion.div>
    );
  }
  if (message.kind === "error") {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-start">
        <p className="max-w-[85%] border-l-2 border-destructive px-3 py-2 font-mono text-sm text-destructive">
          {message.text}
        </p>
      </motion.div>
    );
  }
  if (message.kind === "refusal" || !message.response) {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-start">
        <p className="max-w-[85%] border-l-2 border-warning px-3 py-2 font-mono text-sm text-warning">
          {message.text}
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div {...ROW_MOTION} className="flex justify-start">
      <AnswerCard text={message.text} response={message.response} />
    </motion.div>
  );
}
```

- [x] **Step 8:** Verify: `npm run build` from `frontend/` — must pass clean (no imports wired yet, so nothing references these; tsc still typechecks the new files).

- [x] **Step 9:** Commit: `git add frontend/src/components/chat` then `git commit -m "fe: add chat answer, evidence, data-context components"`
### Task 3: Command input

**Files:**
- Create: `frontend/src/components/chat/CommandInput.tsx`

**Interfaces:**
- Produces: `CommandInput({ onSubmit, disabled })` — consumed by Task 6.

- [x] **Step 1:** Create `frontend/src/components/chat/CommandInput.tsx`:

```tsx
import { useState } from "react";
import { ArrowUp, Command } from "lucide-react";

export function CommandInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (question: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setValue("");
  };
  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-end gap-1 font-mono text-[10px] text-muted-foreground/50">
        <Command size={10} />
        <span>Enter to analyze</span>
      </div>
      <div className="flex items-center gap-2 border border-border bg-[#0D0F0F] px-3 py-2 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_1px_rgba(45,212,191,0.15)]">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about floats, regions, or measurements..."
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-40"
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </div>
  );
}
```

- [x] **Step 2:** Verify: `npm run build` from `frontend/` — must pass clean.

- [x] **Step 3:** Commit: `git add frontend/src/components/chat/CommandInput.tsx` then `git commit -m "fe: add command-style query input"`

### Task 4: Instrument header

**Files:**
- Create: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/components/ui/segmented-control.tsx` (restyle to sharp instrument look — the pill/spring design clashes with the panel aesthetic)

**Interfaces:**
- Consumes: `LanguageToggle` (existing), `Tooltip`/`TooltipContent`/`TooltipTrigger` (`@/components/ui/tooltip`), `Language` type.
- Produces: `Header({ language, onLanguageChange, floatId, profileCount, region })` — consumed by Task 8.

- [x] **Step 1:** Create `frontend/src/components/Header.tsx`:

```tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import type { Language } from "../types";
import { LanguageToggle } from "./LanguageToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Header({
  language,
  onLanguageChange,
  floatId,
  profileCount,
  region,
}: {
  language: Language;
  onLanguageChange: (language: Language) => void;
  floatId: string;
  profileCount: number;
  region: string;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <header className="relative z-20 flex items-center justify-between border-b border-border bg-[#0D0F0F]/90 px-5 py-2.5">
      <div className="flex items-baseline gap-3">
        <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground">
          Float<span className="text-primary">Chat</span>
        </h1>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:inline">
          Deep-Sea Instrument Panel · Indian Ocean
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex cursor-default items-center gap-1.5 font-mono text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 sonar-pulse" />
              LIVE
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Streaming ARGO float {"\u00B7"} {profileCount} profiles {"\u00B7"} {region}
          </TooltipContent>
        </Tooltip>
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">float {floatId}</span>
        <LanguageToggle language={language} onChange={onLanguageChange} />
        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex h-7 w-7 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            aria-label="Dataset settings"
          >
            <Settings2 size={14} />
          </button>
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full z-30 mt-2 w-60 border border-border bg-[#0D0F0F] p-3 font-mono text-[11px] leading-relaxed text-muted-foreground shadow-xl"
              >
                <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">Dataset Status</div>
                <div>source: demo subset (Indian Ocean)</div>
                <div>ingest: QC flag 4 filtered</div>
                <div>guardrail: SELECT-only</div>
                <div>model: Gemini 3.6 Flash</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
```

- [x] **Step 2:** Restyle `frontend/src/components/ui/segmented-control.tsx` to match the instrument look (keep the spring thumb, make it square and border-based):

```tsx
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center border border-border bg-[#0D0F0F] p-0",
        size === "sm" ? "h-7" : "h-9"
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative h-full outline-none transition-colors",
              size === "sm" ? "px-2.5" : "px-4",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="segmented-thumb"
                transition={{ type: "spring", stiffness: 500, damping: 34 }}
                className="absolute inset-0 border border-primary/60 bg-primary/5"
              />
            )}
            <span
              className={cn(
                "relative z-10 font-mono text-[10px] uppercase tracking-[0.12em]",
                size === "md" && "text-xs"
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [x] **Step 3:** Verify: `npm run build` from `frontend/` — must pass clean.

- [x] **Step 4:** Commit: `git add frontend/src/components/Header.tsx frontend/src/components/ui/segmented-control.tsx` then `git commit -m "fe: add compact instrument header with settings popover"`
### Task 5: Scientific chart + chart controls

**Files:**
- Create: `frontend/src/components/charts/ScientificChart.tsx`, `frontend/src/components/charts/ChartControls.tsx`

**Interfaces:**
- Consumes: `DEMO_METRICS`, `DemoMetric`, `DemoScale`, `exportCsv` from `lib/demo.ts` (Task 1); `QueryResponse` from `types.ts`; `DataQuality` from `components/chat/DataQuality` (Task 2); `toast` from `sonner`.
- Produces: `ScientificChart({ response })` and `ChartControls({ metric, onMetricChange, scale, onScaleChange, onExport })` — consumed by Task 7.

- [x] **Step 1:** Create `frontend/src/components/charts/ChartControls.tsx`:

```tsx
import { Download } from "lucide-react";
import type { DemoMetric, DemoScale } from "../../lib/demo";
import { cn } from "../../lib/utils";

const METRICS: { id: DemoMetric; label: string }[] = [
  { id: "temperature", label: "Temperature" },
  { id: "salinity", label: "Salinity" },
  { id: "pressure", label: "Pressure" },
  { id: "oxygen", label: "Oxygen" },
];

const SCALES: { id: DemoScale; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors",
        active
          ? "border-primary/60 bg-primary/5 text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function ChartControls({
  metric,
  onMetricChange,
  scale,
  onScaleChange,
  onExport,
}: {
  metric: DemoMetric;
  onMetricChange: (m: DemoMetric) => void;
  scale: DemoScale;
  onScaleChange: (s: DemoScale) => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-0.5">
        {METRICS.map((m) => (
          <SegButton key={m.id} active={metric === m.id} onClick={() => onMetricChange(m.id)}>
            {m.label}
          </SegButton>
        ))}
      </div>
      <div className="flex items-center gap-0.5">
        {SCALES.map((s) => (
          <SegButton key={s.id} active={scale === s.id} onClick={() => onScaleChange(s.id)}>
            {s.label}
          </SegButton>
        ))}
        <span className="mx-1 h-3 w-px bg-border" />
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
        >
          <Download size={12} /> Export
        </button>
      </div>
    </div>
  );
}
```

- [x] **Step 2:** Create `frontend/src/components/charts/ScientificChart.tsx`:

```tsx
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { QueryResponse } from "../../types";
import {
  DEMO_METRICS,
  exportCsv,
  type DemoMetric,
  type DemoScale,
} from "../../lib/demo";
import { DataQuality } from "../chat/DataQuality";
import { ChartControls } from "./ChartControls";

const TICK = {
  fill: "#8b8b8b",
  fontSize: 10,
  fontFamily: "IBM Plex Mono, monospace",
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ScientificTooltip({
  active,
  payload,
  label,
  metric,
  unit,
  color,
}: {
  active?: boolean;
  payload?: { payload: { value: number; observations: number; quality: number } }[];
  label?: string | number;
  metric: string;
  unit: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const rows = [
    { name: metric, value: `${p.value.toFixed(1)} ${unit}`, color },
    { name: "Observations", value: p.observations.toLocaleString(), color: "#8b8b8b" },
    { name: "Quality", value: `${p.quality}%`, color: p.quality >= 80 ? "#34d399" : p.quality >= 65 ? "#22d3ee" : "#fbbf24" },
  ];
  return (
    <div className="border-l-2 border-primary bg-[#0D0F0F] px-3 py-2.5 font-mono text-xs text-foreground shadow-xl" style={{ borderColor: color }}>
      <div className="mb-1.5 text-muted-foreground">{label}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-muted-foreground">{r.name}</span>
          <span style={{ color: r.color }} className="font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ScientificChart({ response }: { response: QueryResponse }) {
  const [metric, setMetric] = useState<DemoMetric>("temperature");
  const [scale, setScale] = useState<DemoScale>("monthly");
  const cfg = DEMO_METRICS[metric];
  const points = cfg[scale];
  const region = (response.chart_data.region as string | undefined) ?? "Indian Ocean";
  const level = response.confidence === "low" ? ("low" as const) : ("high" as const);
  const title = `${scale === "monthly" ? "Monthly Mean" : "Annual Mean"}`;

  const handleExport = () => {
    downloadCsv(exportCsv(metric, scale), `floatchat_${metric}_${scale}.csv`);
    toast.success("Export ready", { description: `${metric} · ${scale} · CSV downloaded` });
  };

  return (
    <div className="flex h-full min-h-0 flex-col border border-border bg-[#111313]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground">{title}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{region}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {points.length} observations
          </span>
          <DataQuality level={level} />
        </div>
      </header>
      <div className="min-h-0 flex-1 p-2.5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: 0 }} key={`${metric}-${scale}`}>
            <CartesianGrid stroke="#1E2020" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="period"
              tick={TICK}
              tickFormatter={(p: string) => (scale === "monthly" ? p.slice(-2) : p)}
              stroke="#1E2020"
              tickLine={false}
              axisLine={{ stroke: "#1E2020" }}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              domain={cfg.domain}
              ticks={cfg.ticks}
              tick={TICK}
              tickFormatter={(v: number) => `${v}${cfg.unit}`}
              stroke="#1E2020"
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip
              content={<ScientificTooltip metric={cfg.label} unit={cfg.unit} color={cfg.color} />}
              cursor={{ stroke: "rgba(45,212,191,0.35)", strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              strokeWidth={2}
              dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: cfg.color, strokeWidth: 0 }}
              animationDuration={900}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartControls
        metric={metric}
        onMetricChange={setMetric}
        scale={scale}
        onScaleChange={setScale}
        onExport={handleExport}
      />
    </div>
  );
}
```

- [x] **Step 3:** Verify: `npm run build` from `frontend/` — must pass clean (tsc catches the `React.ReactNode` reference in ChartControls via `@types/react` global; if it errors, add `import type { ReactNode } from "react"` and use `ReactNode`).

- [x] **Step 4:** Commit: `git add frontend/src/components/charts/ScientificChart.tsx frontend/src/components/charts/ChartControls.tsx` then `git commit -m "fe: add scientific chart with crosshair tooltip and controls"`
### Task 6: Rework ChatPanel with seeded conversation

**Files:**
- Modify: `frontend/src/components/ChatPanel.tsx` (full replacement), `frontend/src/components/chat/ChatMessage.tsx` (add `onRelated` + RelatedQueries)
- Delete: `frontend/src/components/ConfidenceBadge.tsx`, `frontend/src/components/ExplainabilityDrawer.tsx`

**Interfaces:**
- Consumes: `Message`/`ChatMessage` (Task 2), `CommandInput` (Task 3), `RelatedQueries` (Task 2), `TIME_SERIES` from `lib/mock.ts` (Task 1), `ask` from `lib/api.ts`, `TypingIndicator` from `@/components/ui/typing-indicator`.
- Produces: `ChatPanel({ language, busy, onBusyChange, onVizChange })` — same props as today; consumed by Task 8.

- [x] **Step 1:** Replace `frontend/src/components/chat/ChatMessage.tsx` with the version below (adds `onRelated` and renders `RelatedQueries` under the answer):

```tsx
import { motion } from "framer-motion";
import type { QueryResponse } from "../../types";
import { AnswerCard } from "./AnswerCard";
import { RelatedQueries } from "./RelatedQueries";

export interface Message {
  role: "user" | "system";
  text: string;
  response?: QueryResponse;
  kind?: "error" | "refusal";
}

const ROW_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function ChatMessage({
  message,
  onRelated,
}: {
  message: Message;
  onRelated?: (q: string) => void;
}) {
  if (message.role === "user") {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-end">
        <div className="max-w-[80%] rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-2 text-[15px] leading-relaxed text-foreground">
          {message.text}
        </div>
      </motion.div>
    );
  }
  if (message.kind === "error") {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-start">
        <p className="max-w-[85%] border-l-2 border-destructive px-3 py-2 font-mono text-sm text-destructive">
          {message.text}
        </p>
      </motion.div>
    );
  }
  if (message.kind === "refusal" || !message.response) {
    return (
      <motion.div {...ROW_MOTION} className="flex justify-start">
        <p className="max-w-[85%] border-l-2 border-warning px-3 py-2 font-mono text-sm text-warning">
          {message.text}
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div {...ROW_MOTION} className="flex justify-start">
      <div className="w-full max-w-[92%]">
        <AnswerCard text={message.text} response={message.response} />
        {onRelated ? <RelatedQueries onSelect={onRelated} /> : null}
      </div>
    </motion.div>
  );
}
```

- [x] **Step 2:** Replace `frontend/src/components/ChatPanel.tsx` with the version below (seeded conversation, new message rendering, CommandInput):

```tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { Language, QueryResponse } from "../types";
import { ask } from "../lib/api";
import { TIME_SERIES } from "../lib/mock";
import { ChatMessage, type Message } from "./chat/ChatMessage";
import { CommandInput } from "./chat/CommandInput";
import { TypingIndicator } from "@/components/ui/typing-indicator";

const EXAMPLE_QUESTION = "How did temperature change in the Bay of Bengal in 2003?";

const SEED: Message[] = [
  { role: "user", text: EXAMPLE_QUESTION },
  { role: "system", text: TIME_SERIES.answer_text, response: TIME_SERIES },
];

export function ChatPanel({
  language,
  busy,
  onBusyChange,
  onVizChange,
}: {
  language: Language;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onVizChange: (response: QueryResponse | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>(SEED);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    onBusyChange(true);
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const response = await ask(text, language);
      const kind: Message["kind"] =
        response.chart_type === "none" && response.refusal_reason ? "refusal" : undefined;
      setMessages((m) => [...m, { role: "system", text: response.answer_text, response, kind }]);
      onVizChange(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((m) => [...m, { role: "system", text: msg, kind: "error" }]);
      onVizChange(null);
      toast.error("Query failed", { description: msg });
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3 lg:p-4">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto py-1 pr-1">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} onRelated={send} />
        ))}
        {busy && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex justify-start"
          >
            <div className="border border-border bg-[#111313] px-4 py-3">
              <TypingIndicator />
            </div>
          </motion.div>
        )}
      </div>
      <div className="shrink-0">
        <CommandInput onSubmit={(q) => void send(q)} disabled={busy} />
      </div>
    </div>
  );
}
```

- [x] **Step 3:** Delete `frontend/src/components/ConfidenceBadge.tsx` and `frontend/src/components/ExplainabilityDrawer.tsx` (superseded by `components/chat/*`; ChatPanel no longer imports them).

- [x] **Step 4:** Verify: `npm run build` from `frontend/` — must pass clean. This will fail if anything still imports the deleted files; fix those imports (none expected).

- [x] **Step 5:** Commit: `git add -A` then `git commit -m "fe: rework chat panel with seeded conversation and structured answer"`
### Task 7: Rework VizPanel to scientific chart

**Files:**
- Modify: `frontend/src/components/VizPanel.tsx` (full replacement)

**Interfaces:**
- Consumes: `ScientificChart` (Task 5), `QueryResponse`, `TrajectoryMap`, `DepthProfileChart`, `ComparisonChart`, `Skeleton`; `ReactNode` from `react`.
- Produces: `VizPanel({ response, loading })` — same props as today; consumed by Task 8.

- [x] **Step 1:** Replace `frontend/src/components/VizPanel.tsx` with the version below (removes MagicCard/BorderBeam/BlurFade; adds chart shell + ScientificChart):

```tsx
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FlaskConical, TriangleAlert, Waves } from "lucide-react";
import type { QueryResponse } from "../types";
import { TrajectoryMap } from "./TrajectoryMap";
import { DepthProfileChart } from "./charts/DepthProfileChart";
import { ComparisonChart } from "./charts/ComparisonChart";
import { ScientificChart } from "./charts/ScientificChart";
import { Skeleton } from "@/components/ui/skeleton";

export function VizPanel({
  response,
  loading,
}: {
  response: QueryResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-full min-h-[280px] flex-col border border-border bg-[#111313]">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
          <Skeleton className="h-3 w-28 bg-muted" />
          <Skeleton className="h-3 w-24 bg-muted" />
        </div>
        <div className="min-h-0 flex-1 p-3">
          <Skeleton className="h-full w-full bg-muted" />
        </div>
      </div>
    );
  }
  if (!response) {
    return (
      <StateCard
        icon={<Waves className="text-primary" size={20} strokeWidth={1.5} />}
        title="query the floats to render a visualization"
        detail="live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles"
      />
    );
  }
  const { chart_type: type, chart_data: data } = response;

  if (type === "none") {
    const reason = response.refusal_reason;
    const title =
      reason === "no_data"
        ? "no data in scope"
        : reason === "unsafe"
          ? "couldn't answer safely"
          : "out of scope";
    const detail =
      reason === "no_data"
        ? "no measurements exist for this region and time window"
        : reason === "unsafe"
          ? "the generated query was rejected by the guardrail layer"
          : "this question is outside the Indian Ocean ARGO subset";
    return (
      <StateCard
        icon={<TriangleAlert className="text-warning" size={20} strokeWidth={1.5} />}
        title={title}
        detail={detail}
        tone="warning"
      />
    );
  }

  if (type === "trajectory") {
    return (
      <ChartShell title="trajectory" subtitle={data.region as string | undefined}>
        <TrajectoryMap
          latitudes={data.latitudes as number[]}
          longitudes={data.longitudes as number[]}
          floatId={data.float_id as string}
        />
      </ChartShell>
    );
  }

  if (type === "comparison" && (data.target === null || data.baseline === null)) {
    return (
      <StateCard
        icon={<FlaskConical className="text-warning" size={20} strokeWidth={1.5} />}
        title="insufficient data"
        detail="not enough measurements in this region and period to compare against a baseline"
        tone="warning"
      />
    );
  }

  if (type === "time_series") {
    return <ScientificChart key={response as unknown as string} response={response} />;
  }

  const title = type === "depth_profile" ? "depth profile" : "comparison";
  const subtitle = `${data.region as string}${data.period ? ` · ${data.period as string}` : ""}`;
  return (
    <ChartShell title={title} subtitle={subtitle}>
      {type === "depth_profile" ? (
        <DepthProfileChart
          depths={data.depths_m as number[]}
          temps={data.temperatures_c as number[]}
          sals={data.salinities_psu as number[]}
        />
      ) : (
        <ComparisonChart target={data.target as number} baseline={data.baseline as number} />
      )}
    </ChartShell>
  );
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full min-h-[280px] flex-col overflow-hidden border border-border bg-[#111313]"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="font-mono text-xs text-muted-foreground/70">{subtitle}</span>
        ) : null}
      </header>
      <div className="min-h-0 flex-1 p-2.5">{children}</div>
    </motion.div>
  );
}

function StateCard({
  icon,
  title,
  detail,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`flex h-full min-h-[280px] flex-col items-center justify-center gap-3 border px-6 text-center ${
        tone === "warning" ? "border-amber-400/40 bg-[#111313]" : "border-dashed border-border bg-[#111313]"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center border border-border bg-[#0D0F0F]">
        {icon}
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="max-w-xs font-mono text-[13px] leading-relaxed text-muted-foreground/70">{detail}</p>
    </motion.div>
  );
}
```

- [x] **Step 2:** Verify: `npm run build` from `frontend/` — must pass clean.

- [x] **Step 3:** Commit: `git add frontend/src/components/VizPanel.tsx` then `git commit -m "fe: rework viz panel to scientific chart workspace"`

### Task 8: Rework App layout

**Files:**
- Modify: `frontend/src/App.tsx` (full replacement), `frontend/src/index.css` (background token + keep sonar-pulse)

**Interfaces:**
- Consumes: `Header` (Task 4), `ChatPanel`/`VizPanel` (Tasks 6/7), `TIME_SERIES` from `lib/mock.ts`, `TooltipProvider`/`Toaster`.
- Produces: the new main route — two-column 48/52 workspace, seeded viz, no demo routes.

- [x] **Step 1:** Replace `frontend/src/App.tsx` with the version below (removes AuroraBackground/Particles/Marquee/NumberTicker/DemoHub/PromptInputDemo, adds Header + subtle vignette + seeded viz):

```tsx
import { useState } from "react";
import type { Language, QueryResponse } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { VizPanel } from "./components/VizPanel";
import { Header } from "./components/Header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TIME_SERIES } from "./lib/mock";

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [viz, setViz] = useState<QueryResponse | null>(() => TIME_SERIES);
  const [busy, setBusy] = useState(false);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[55vh] bg-[radial-gradient(80%_60%_at_50%_0%,rgba(45,212,191,0.06),transparent)]"
        />
        <div className="flex h-full flex-col">
          <Header
            language={language}
            onLanguageChange={setLanguage}
            floatId="2900226"
            profileCount={125}
            region="Bay of Bengal"
          />
          <main className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[48%_52%]">
            <section className="order-1 min-h-0 border-t border-border lg:border-r lg:border-t-0">
              <ChatPanel
                language={language}
                busy={busy}
                onBusyChange={setBusy}
                onVizChange={setViz}
              />
            </section>
            <section className="order-2 min-h-0 border-t border-border p-3 lg:border-t-0 lg:p-4">
              <VizPanel response={viz} loading={busy} />
            </section>
          </main>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}
```

- [x] **Step 2:** Modify `frontend/src/index.css`: set `--background` to `0 0% 3%` (was 4%). Keep `sonar-pulse` keyframes. No other token changes required (panels use the spec hexes directly in components).

- [x] **Step 3:** Verify: `npm run build` from `frontend/` — must pass clean (will fail if deleted files are still imported; fix if so).

- [x] **Step 4:** Start the dev server on 5199 (see Verification section) and run the headless DOM dump against `http://localhost:5199/`. Expected markers present: `Deep-Sea Instrument Panel`, `LIVE`, `float 2900226`, the seeded question text, `Low confidence`, `Data Context`, `Related Queries`, `Monthly Mean`, `8 observations`, `Temperature`, `Salinity`, `Pressure`, `Oxygen`, `Export`. No `There was an error` in the console output.

- [x] **Step 5:** Commit: `git add -A` then `git commit -m "fe: rework app layout to instrument workspace"`
### Task 9: Clean up dead demo files + tailwind

**Files:**
- Delete (confirmed unreferenced after Tasks 6-8 — verified by grep below): `frontend/src/demo/` (DemoHub.tsx, PromptInputDemo.tsx, StockChartDemo.tsx), `frontend/src/components/charts/StockChart.tsx`, `frontend/src/components/charts/TimeSeriesChart.tsx`, `frontend/src/components/ui/ai-chat-input.tsx`, `frontend/src/components/ui/aurora-background.tsx`, `frontend/src/components/ui/blur-fade.tsx`, `frontend/src/components/ui/border-beam.tsx`, `frontend/src/components/ui/magic-card.tsx`, `frontend/src/components/ui/marquee.tsx`, `frontend/src/components/ui/number-ticker.tsx`, `frontend/src/components/ui/particles.tsx`
- Modify: `frontend/tailwind.config.js` (remove `marquee` + `marquee-vertical` keyframes and their `animation` entries)
- Keep (still referenced): `LanguageToggle.tsx`, `ui/segmented-control.tsx`, `ui/typing-indicator.tsx`, `ui/skeleton.tsx`, `ui/sonner.tsx`, `ui/tabs.tsx`, `ui/tooltip.tsx`, `charts/ChartTooltip.tsx` (NOTE: still imported by the kept `DepthProfileChart` + `ComparisonChart`, both rendered by the new VizPanel — do NOT delete)

- [x] **Step 1:** `Remove-Item` the 11 files/dirs listed above (also `frontend/src/components/ConfidenceBadge.tsx` + `ExplainabilityDrawer.tsx` if Task 6 step 3 hasn't run yet — it has, they're already gone).
- [x] **Step 2:** In `frontend/tailwind.config.js` delete the `marquee`/`marquee-vertical` keyframes block (currently lines ~70-79) and the `marquee`/`marquee-vertical` animation entries (lines ~82-83). Leave `accordion-down`/`accordion-up` untouched.
- [x] **Step 3:** Grep for stale imports before building:
  `rg -n "marquee|particles|aurora-background|blur-fade|border-beam|magic-card|number-ticker|ai-chat-input|StockChart|TimeSeriesChart|DemoHub|PromptInputDemo|StockChartDemo" frontend/src` — expect **zero matches** (aside from inside any remaining comments; none expected). NOTE: `ChartTooltip` is intentionally excluded — it is kept and imported by the surviving `DepthProfileChart`/`ComparisonChart`.
- [x] **Step 4:** Verify: `npm run build` from `frontend/` — must pass clean.
- [x] **Step 5:** Commit: `git add -A` then `git commit -m "fe: remove demo scaffolding and unused ui primitives"`

### Task 10: Final verification

- [x] **Step 1:** Full build: `npm run build` from `frontend/` — clean.
- [x] **Step 2:** Start a fresh dev server on 5199 (kill any stale process first, then run detached as in the Verification section, log to `dev5199.log`).
- [x] **Step 3:** Headless DOM dump against `http://localhost:5199/`. Assert the full instrument panel renders with **no `There was an error`** and no React error boundary text. Expected markers (grep the dump):
  - Header: `Deep-Sea Instrument Panel`, `LIVE`, `float 2900226`
  - Seeded conversation: the seeded question text, `Low confidence`, `Data Context`, `Related Queries`
  - Chart: `Monthly Mean`, `8 observations`, `Bay of Bengal`, metric buttons `Temperature` `Salinity` `Pressure` `Oxygen`, `Export`
  - Values: `20.7`, `27.4`, `2003-08`
- [x] **Step 4:** Manual interaction checklist (browser):
  - Expand `How I got this` — shows SQL + floats; refresh keeps it collapsed.
  - Hover the chart → crosshair + tooltip rows (Observations / Quality).
  - Switch metric (Salinity) and scale (Yearly); chart remounts + re-animates; Y ticks change (e.g. `2002` `2003` `2004`).
  - Export → downloads `floatchat_temperature_monthly.csv` + success toast.
  - Send a new query → busy typing indicator → new answer + chart swaps; ask something unrelated (e.g. "how is the weather") → refusal/insufficient state with amber card.
  - EN/HI toggle in header; settings popover opens.
  - Resize to mobile width → single column, order: chat → chart → input.
  - Language toggle still works after the segmented-control restyle.
- [x] **Step 5:** Fix anything found; re-run build + dump. 
- [x] **Step 6:** Commit: `git add -A` then `git commit -m "fe: polish instrument panel verification pass"` (only if fixes were needed).

---

## Verification

- Build (the only gate): `cd frontend && npm run build` → `tsc --noEmit && vite build`, must exit 0.
- Fresh-load DOM check (no dev server → create one):
  1. `Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -match "node" } | Stop-Process -Force` (only when the 5173/5174 servers are not needed)
  2. `Set-Location frontend` then `Start-Process cmd.exe -ArgumentList '/c', 'npm run dev -- --port 5199 --strictPort > dev5199.log 2>&1'`
  3. `Start-Sleep -Seconds 8`
  4. `& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --dump-dom "http://localhost:5199/" 2>&1 | Where-Object { $_ -is [string] }`
  5. Grep the dump for markers above. Use `http://localhost:5199/` — the server binds IPv6 `::1`; `127.0.0.1` gives a connection-refused page. Must use the `2>&1` pipeline (file redirection yields 0 bytes).
- Kill the 5199 server and remove `frontend/dev5199.log` when done.

## Rollback

- Structural change checkpoint exists: spec commit `393ad5f` (`docs: add deep-sea instrument panel redesign spec`).
- Each task commits atomically; revert a failed task with `git revert <commit>`.
- If the shared `QueryResponse` contract (§4 of ARCHITECTURE.md) were to need changing, stop and flag it — none is planned.