# FloatChat Frontend — 21st.dev Premium Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled Tailwind frontend with a dark, premium "deep-sea instrument panel" built on shadcn/ui + 21st.dev components + `framer-motion`, swapping Plotly for animated recharts cards (Leaflet trajectory map kept, re-skinned).

**Architecture:** Bootstrap a shadcn/ui foundation (CSS-variable theme, `cn()` util, `@/` alias) into the existing Vite+React+Tailwind v3 app, then rework each component to consume the new theme tokens. Pull 21st.dev components (segmented control, typing indicator, aurora background) via the shadcn CLI registry; write charts, bubbles, and the drawer as polished custom components in the same style. Presentation-only — `types.ts`, `api.ts`, and the `/query` contract never change.

**Tech Stack:** React 18.3, Vite 6, Tailwind 3.4.15, shadcn/ui (new-york style), framer-motion, recharts, lucide-react, Leaflet 1.9, 21st.dev registry (shadcn CLI), Node v24.3.0 / npm 11.4.2.

## Global Constraints

- **All commands run from `frontend/`** (use the tool's `workdir` — do not `cd`).
- **PowerShell shell.** Env var syntax is `$env:API_KEY_21ST` (bare `$API_KEY_21ST` will NOT expand). `API_KEY_21ST` IS set in the environment.
- **React 18.3, Tailwind v3.4 (not v4), Vite 6.** If the shadcn CLI errors on framework detection, fall back to manual edits described in the task.
- **`npm run build` (= `tsc --noEmit && vite build`) is the acceptance gate** for every task. There is no test framework and no lint script — do not add one (out of scope).
- **Do NOT modify** `frontend/src/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/lib/mock.ts`, or any backend file. Only presentation + frontend deps change.
- **`tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`** — every import and param must be used, or `tsc` fails.
- Keep **IBM Plex Mono** (numbers/labels) and **Inter** (body) + `font-mono`/`font-sans`/`font-hindi` tailwind keys. Keep `class="dark"` on `<html>` (already set in `index.html`).
- Keep **Leaflet** for the trajectory map (do not swap). Remove **Plotly** once VizPanel stops importing it.
- Preserve all current behavior: EN/HI toggle (interactive control lives in the composer; header shows a readout), suggestions, busy/error/refusal states, confidence badge logic, explainability content fields.
- Visual style: dark, calm, precise. Motion 300–400ms ease-out. No bouncy easing, no purple gradients.
- Commit after every task. Messages: `fe:`/`chore:`/`docs:` prefix, imperative, short.

---

## File Structure

**Created:**
- `frontend/components.json` — shadcn config
- `frontend/src/lib/utils.ts` — `cn()` (clsx + tailwind-merge)
- `frontend/src/components/charts/ChartTooltip.tsx` — shared recharts tooltip
- `frontend/src/components/charts/DepthProfileChart.tsx`
- `frontend/src/components/charts/TimeSeriesChart.tsx`
- `frontend/src/components/charts/ComparisonChart.tsx`
- `frontend/src/components/ui/*` — added by `npx shadcn@latest add` for 21st.dev components (segmented-control, typing-indicator, aurora-background)

**Modified:**
- `frontend/package.json` — deps
- `frontend/tsconfig.json` — `@/*` path alias
- `frontend/vite.config.ts` — `@` alias
- `frontend/src/index.css` — theme tokens (rewrite)
- `frontend/tailwind.config.js` — theme mapping (rewrite)
- `frontend/src/App.tsx` — shell, header, background
- `frontend/src/components/ChatPanel.tsx` — full rewrite
- `frontend/src/components/VizPanel.tsx` — full rewrite
- `frontend/src/components/TrajectoryMap.tsx` — re-skin
- `frontend/src/components/ExplainabilityDrawer.tsx` — full rewrite
- `frontend/src/components/ConfidenceBadge.tsx` — re-skin

**Removed (Task 8):** `plotly.js-dist-min`, `@types/plotly.js`.

---

### Task 0: Git checkpoint

- [ ] **Step 1: Verify clean-ish tree and create checkpoint**

Run (from repo root `C:\Users\Garvi\Desktop\Projects\FloatChat`):
```powershell
git add -A; if ($?) { git commit -m "chore: checkpoint before frontend 21st rework" }
```
Expected: commit created (or "nothing to commit" — fine either way).

---

### Task 1: shadcn/ui bootstrap + theme tokens

**Files:**
- Create: `frontend/components.json`, `frontend/src/lib/utils.ts`
- Modify: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/src/index.css`, `frontend/tailwind.config.js`
- Test: `npm run build` + `npm run dev` visual smoke

**Interfaces:**
- Produces: `@/` alias (`@/lib/utils` → `src/lib/utils`, `@/components/...` → `src/components/...`), `cn()` util, theme tokens `hsl(var(--background))` etc. consumed by all later tasks.

- [ ] **Step 1: Install dependencies**

Run (workdir `frontend`):
```powershell
npm install clsx tailwind-merge class-variance-authority framer-motion lucide-react recharts
npm install -D tailwindcss-animate
```
Expected: packages added to `package.json`.

- [ ] **Step 2: Configure `@/` path alias**

`frontend/tsconfig.json` — add inside `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

`frontend/vite.config.ts` — replace the whole file:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/query": "http://127.0.0.1:8000",
      "/health": "http://127.0.0.1:8000",
    },
  },
});
```

- [ ] **Step 3: Create shadcn config**

Create `frontend/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 4: Create `cn` util**

Create `frontend/src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Rewrite `src/index.css` with the deep-instrument theme**

Replace the entire file:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 222 44% 6%;
  --foreground: 210 40% 96%;
  --card: 222 40% 8%;
  --card-foreground: 210 40% 96%;
  --popover: 222 40% 8%;
  --popover-foreground: 210 40% 96%;
  --primary: 174 72% 50%;
  --primary-foreground: 222 47% 7%;
  --secondary: 220 30% 14%;
  --secondary-foreground: 210 40% 92%;
  --muted: 220 28% 12%;
  --muted-foreground: 215 18% 58%;
  --accent: 220 30% 14%;
  --accent-foreground: 210 40% 96%;
  --destructive: 0 62% 55%;
  --destructive-foreground: 210 40% 96%;
  --warning: 32 95% 64%;
  --warning-foreground: 222 47% 7%;
  --border: 220 26% 16%;
  --input: 220 26% 16%;
  --ring: 174 72% 50%;
  --radius: 0.625rem;
}

html,
body,
#root {
  height: 100%;
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: "Inter", system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

.lang-hi {
  font-family: "Noto Sans Devanagari", "Inter", sans-serif;
}

/* Sonar pulse for the LIVE badge and low-confidence dot */
@keyframes sonar-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 hsla(174, 72%, 50%, 0.5);
  }
  50% {
    box-shadow: 0 0 0 4px hsla(174, 72%, 50%, 0);
  }
}

.sonar-pulse {
  animation: sonar-pulse 2s ease-out infinite;
}

/* Leaflet tooltip on dark */
.float-map-tip {
  background: hsl(var(--card)) !important;
  border: 1px solid hsl(var(--border)) !important;
  color: hsl(var(--foreground)) !important;
  font-family: "IBM Plex Mono", monospace !important;
  font-size: 11px !important;
  border-radius: 4px !important;
}

/* Scrollbars in dark theme */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
```

- [ ] **Step 6: Rewrite `tailwind.config.js`**

Replace the entire file:
```js
import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
        hindi: ["Noto Sans Devanagari", "Inter", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
```

- [ ] **Step 7: Smoke-test the theme tokens**

In `frontend/src/App.tsx` change only the root div classes:
```tsx
<div className="flex h-screen w-screen flex-col bg-background text-foreground">
```
and the header border + title so it visibly uses theme tokens:
```tsx
<header className="flex items-center justify-between border-b border-border px-6 py-3">
  ...
  <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
```
Leave `ChatPanel`/`VizPanel` as-is for now (old classes still work — Task 1 does NOT delete them yet).

- [ ] **Step 8: Verify build + dev**

Run (workdir `frontend`): `npm run build`
Expected: `tsc --noEmit` clean, `vite build` succeeds.

Run (workdir `frontend`): `npm run dev`, open `http://localhost:5173`.
Expected: app renders on the new near-black background; header title is near-white; the old teal/terracotta accents still render inside chat/viz (not yet migrated). No console errors.

- [ ] **Step 9: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: bootstrap shadcn theme foundation and aliases" }
```

---

### Task 2: EN/HI segmented control (21st.dev) + header restyle

**Files:**
- Install (shadcn CLI): `@/components/ui/segmented-control` from ddoemonn
- Modify: `frontend/src/App.tsx` (header), create `frontend/src/components/LanguageToggle.tsx`
- Test: `npm run build` + dev check

**Interfaces:**
- Produces: `<LanguageToggle language={Language} onChange={(l: Language) => void} />` — used by ChatPanel in Task 4.
- Consumes: 21st.dev `segmented-control` (installed to `src/components/ui/segmented-control.tsx`).

- [ ] **Step 1: Install ddoemonn segmented control**

Run (workdir `frontend`):
```powershell
npx shadcn@latest add "https://21st.dev/r/ddoemonn/segmented-control?api_key=$env:API_KEY_21ST" -y
```
Expected: `src/components/ui/segmented-control.tsx` (plus deps) created; `components.json`/deps updated.

If the CLI fails (registry/detection error), fallback: fetch the component with `21st_get_component({ id: 23552 })` and save the returned source to `src/components/ui/segmented-control.tsx` manually, then `npm install` its deps.

- [ ] **Step 2: Read the installed component's API**

Read `frontend/src/components/ui/segmented-control.tsx`. Note the exact exported component name and its props (expected shape: `options: { value: string; label: string }[]`, `value`, `onChange`, maybe `size`). Record the prop names — the wrapper below must match them.

- [ ] **Step 3: Create `LanguageToggle` wrapper**

Create `frontend/src/components/LanguageToggle.tsx`:
```tsx
import type { Language } from "../types";
import { SegmentedControl } from "@/components/ui/segmented-control";

export function LanguageToggle({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <SegmentedControl
      options={[
        { value: "en", label: "EN" },
        { value: "hi", label: "हिं" },
      ]}
      value={language}
      onChange={(v: string) => onChange(v as Language)}
      size="sm"
    />
  );
}
```
Adjust the `SegmentedControl` props (name, `size`) to match Step 2's findings. If the component has no `size` prop, drop it.

- [ ] **Step 4: Restyle the header in `App.tsx`**

Replace the header JSX block in `frontend/src/App.tsx` with:
```tsx
<header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3 backdrop-blur">
  <div className="flex items-baseline gap-3">
    <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
      Float<span className="text-primary">Chat</span>
    </h1>
    <span className="hidden font-mono text-xs tracking-widest text-muted-foreground sm:inline">
      DEEP-SEA INSTRUMENT PANEL · INDIAN OCEAN
    </span>
  </div>
  <div className="flex items-center gap-4">
    <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-primary sonar-pulse" />
      LIVE · float 2900226
    </span>
    <span className="font-mono text-xs text-muted-foreground">
      {language === "en" ? "en · english" : "hi · हिन्दी"}
    </span>
  </div>
</header>
```
Keep `main`/`section`/`aside` layout as-is (borders will be migrated in later tasks).

- [ ] **Step 5: Verify build + dev**

Run (workdir `frontend`): `npm run build`
Expected: clean.

Run dev and check `http://localhost:5173`: header shows wordmark with primary-teal "Chat", subtitle, pulsing LIVE badge, muted language readout; the segmented control is not visible yet (it renders in the composer in Task 4).

- [ ] **Step 6: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: add 21st segmented control and restyle header" }
```

---

### Task 3: Animated background (21st.dev aurora, ocean variant)

**Files:**
- Install (shadcn CLI): `@/components/ui/aurora-background` from pulkitxm
- Modify: `frontend/src/App.tsx`
- Test: `npm run build` + dev check

**Interfaces:**
- Consumes: 21st.dev `aurora-background` (installed to `src/components/ui/aurora-background.tsx`).

- [ ] **Step 1: Install pulkitxm aurora background**

Run (workdir `frontend`):
```powershell
npx shadcn@latest add "https://21st.dev/r/pulkitxm/aurora-background?api_key=$env:API_KEY_21ST" -y
```
Expected: `src/components/ui/aurora-background.tsx` created.

Fallback if CLI fails: `21st_get_component({ id: 18263 })`, save source manually, install deps.

- [ ] **Step 2: Read the installed component's API**

Read the installed file. Note the exported component name and props (expected: a wrapper that can surround children, with a `variant` and/or `className`). The component description says it "wraps any content" with color variants including `ocean`.

- [ ] **Step 3: Wrap the app shell**

In `frontend/src/App.tsx`:
1. Import the background: `import { AuroraBackground } from "@/components/ui/aurora-background";`
2. Wrap the existing root `<div className="flex h-screen ...">` inside the background so the aurora renders behind it:
```tsx
return (
  <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
    <AuroraBackground
      variant={/* "ocean" or the closest available variant */}
      className="pointer-events-none absolute inset-0 -z-10 opacity-40"
    />
    <div className="flex h-full flex-col">
      {/* header + main as they are now */}
    </div>
  </div>
);
```
Adjust to match the installed component's actual props (variant name, whether it needs to sit behind content vs wrap it). Goal: a **subtle** drifting glow — opacity ≤ 50%, nothing flashy or purple. If the component is a wrapper that injects its own background, set its `className` to `-z-10 opacity-40`.

- [ ] **Step 4: Verify build + dev**

Run (workdir `frontend`): `npm run build` — clean.

Run dev, check `http://localhost:5173`: a calm, subtle animated glow behind the header/chat/viz; text remains readable (no bright patches behind the chat column). Adjust opacity if too strong.

- [ ] **Step 5: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: add subtle animated aurora background" }
```

---

### Task 4: ChatPanel rewrite — bubbles, composer, empty state, typing indicator

**Files:**
- Install (shadcn CLI): `@/components/ui/typing-indicator` from ddoemonn
- Modify: `frontend/src/components/ChatPanel.tsx` (full rewrite)
- Test: `npm run build` + dev check (mock mode)

**Interfaces:**
- Consumes: `LanguageToggle` (Task 2), `ConfidenceBadge` + `ExplainabilityDrawer` (existing, re-synced in Tasks 6–7), `ask` from `../lib/api`, `cn` from `../lib/utils`, `@/components/ui/typing-indicator`.
- Produces: same props/behavior as today — `ChatPanel({ language, onLanguageChange, onVizChange })`.

- [ ] **Step 1: Install ddoemonn typing indicator**

Run (workdir `frontend`):
```powershell
npx shadcn@latest add "https://21st.dev/r/ddoemonn/typing-indicator?api_key=$env:API_KEY_21ST" -y
```
Expected: `src/components/ui/typing-indicator.tsx` created.

Fallback if CLI fails: `21st_get_component({ id: 23580 })`, save manually, install deps.

- [ ] **Step 2: Read the installed typing indicator's API**

Read the installed file. Note the exported name (expected `TypingIndicator`) and whether it needs props (some take a list of typing users; for a single assistant we render it bare).

- [ ] **Step 3: Rewrite `ChatPanel.tsx`**

Replace the entire file (keep the same props, state, `send`, `onSubmit`, and effects as today; only presentation changes):

```tsx
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SendHorizonal, Waves } from "lucide-react";
import type { Language, QueryResponse } from "../types";
import { ask } from "../lib/api";
import { cn } from "../lib/utils";
import { LanguageToggle } from "./LanguageToggle";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { ExplainabilityDrawer } from "./ExplainabilityDrawer";
import { TypingIndicator } from "@/components/ui/typing-indicator";

interface Message {
  role: "user" | "system";
  text: string;
  response?: QueryResponse;
  kind?: "error" | "refusal";
}

const SUGGESTIONS = [
  "How did temperature change in the Bay of Bengal in 2003?",
  "Show the depth profile for float 2900226",
  "Was March 2003 unusually warm in the Bay of Bengal?",
  "बंगाल की खाड़ी में 2003 में तापमान कैसे बदला?",
];

const BUBBLE_MOTION = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function ChatPanel({
  language,
  onLanguageChange,
  onVizChange,
}: {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onVizChange: (response: QueryResponse | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const response = await ask(text, language);
      const kind: Message["kind"] =
        response.chart_type === "none" && response.refusal_reason ? "refusal" : undefined;
      setMessages((m) => [...m, { role: "system", text: response.answer_text, response, kind }]);
      onVizChange(response);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "system",
          text: err instanceof Error ? err.message : "Something went wrong.",
          kind: "error",
        },
      ]);
      onVizChange(null);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-1 py-4">
        {empty ? (
          <EmptyState onSuggest={send} busy={busy} />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  {...BUBBLE_MOTION}
                  className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-primary/90 px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-bl-sm border-l-2 bg-card px-4 py-2.5 shadow-sm",
                        msg.kind === "error"
                          ? "border-destructive"
                          : msg.kind === "refusal"
                            ? "border-warning"
                            : "border-primary"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[15px] leading-relaxed text-foreground",
                          msg.kind === "error" && "font-mono text-[14px] text-destructive"
                        )}
                      >
                        {msg.text}
                      </p>
                      {msg.kind === "refusal" && (
                        <div className="mt-1.5 font-mono text-xs uppercase tracking-widest text-warning">
                          {msg.response?.refusal_reason === "no_data"
                            ? "no data in scope"
                            : msg.response?.refusal_reason === "unsafe"
                              ? "couldn't answer safely"
                              : "out of scope"}
                        </div>
                      )}
                      {msg.response && msg.kind !== "refusal" && (
                        <div className="mt-2 flex items-center gap-3">
                          <ConfidenceBadge
                            confidence={msg.response.confidence}
                            note={msg.response.confidence_note}
                          />
                        </div>
                      )}
                      {msg.response && msg.kind !== "refusal" && (
                        <ExplainabilityDrawer
                          info={msg.response.explainability}
                          confidence={msg.response.confidence}
                        />
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {busy && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex justify-start"
              >
                <div className="rounded-2xl rounded-bl-sm border-l-2 border-primary bg-card px-4 py-3 shadow-sm">
                  <TypingIndicator />
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border pt-3">
        <form onSubmit={onSubmit}>
          <div className="cursor-text rounded-2xl border border-input bg-card shadow-lg transition-all focus-within:border-primary/70 focus-within:ring-1 focus-within:ring-ring">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask about floats, regions, or measurements…"
              disabled={busy}
              rows={1}
              className="w-full resize-none overflow-hidden bg-transparent px-4 pb-0 pt-3.5 text-[15px] leading-[1.6] text-foreground outline-none placeholder:text-muted-foreground/40 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-2">
              <div className="flex items-center gap-1 pl-1.5">
                <LanguageToggle language={language} onChange={onLanguageChange} />
              </div>
              <motion.button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  input.trim() && !busy
                    ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)_/_0.4)] hover:bg-primary/80"
                    : "bg-muted text-muted-foreground/40"
                )}
              >
                <SendHorizonal size={15} />
              </motion.button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptyState({
  onSuggest,
  busy,
}: {
  onSuggest: (question: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-card"
      >
        <Waves className="text-primary" size={26} strokeWidth={1.5} />
      </motion.div>
      <p className="font-mono text-[15px] text-muted-foreground">Ask about the Indian Ocean float data.</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground/70">
        Live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles
      </p>
      <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            type="button"
            onClick={() => onSuggest(s)}
            disabled={busy}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.08, ease: "easeOut" }}
            className="rounded-full border border-border bg-card px-4 py-2 text-[14px] text-muted-foreground transition-colors hover:border-primary/70 hover:text-foreground disabled:opacity-50"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build + dev (mock mode)**

Run (workdir `frontend`): `npm run build` — clean.

Start dev with mocks (workdir `frontend`):
```powershell
$env:VITE_USE_MOCK="true"; npm run dev
```
Open `http://localhost:5173`, enable the mock env (create `frontend/.env` with `VITE_USE_MOCK=true` if you prefer, then `npm run dev`). Check:
- Empty state renders with animated sonar wave + staggered suggestion chips.
- Send a suggestion → user bubble right-aligned (primary fill), then a busy bubble with the 21st typing indicator, then a system bubble (card, primary left border).
- EN/HI segmented control in the composer toggles the header readout.
- Composer auto-grows; send button scales on tap.

- [ ] **Step 5: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: rewrite chat panel with motion and 21st typing indicator" }
```

---

### Task 5: VizPanel rewrite — recharts chart cards

**Files:**
- Create: `frontend/src/components/charts/ChartTooltip.tsx`, `DepthProfileChart.tsx`, `TimeSeriesChart.tsx`, `ComparisonChart.tsx`
- Modify: `frontend/src/components/VizPanel.tsx` (full rewrite; drops Plotly)
- Test: `npm run build` + dev check (mock mode)

**Interfaces:**
- Consumes: `QueryResponse` from `../types`, `TrajectoryMap` (Task 6 re-skin), `cn` from `../lib/utils`.
- Produces: `<DepthProfileChart depths temps sals region period />`, `<TimeSeriesChart months values unit region />`, `<ComparisonChart target baseline region period />` — all `width/height: 100%`.

- [ ] **Step 1: Create `ChartTooltip.tsx`**

```tsx
interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  stroke?: string;
}

export function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground shadow-lg">
      {label != null && <div className="mb-1 text-muted-foreground">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color ?? p.stroke ?? "hsl(var(--primary))" }}
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="text-foreground">
            {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `DepthProfileChart.tsx`**

```tsx
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

const TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

export function DepthProfileChart({
  depths,
  temps,
  sals,
}: {
  depths: number[];
  temps: number[];
  sals: number[];
}) {
  const rows = depths.map((depth, i) => ({ depth, temp: temps[i], sal: sals[i] }));
  const maxDepth = Math.max(...depths, 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="temp"
          type="number"
          xAxisId="temp"
          orientation="bottom"
          domain={[0, 32]}
          tick={TICK}
          tickFormatter={(v) => `${v}°`}
          stroke="hsl(var(--border))"
        />
        <XAxis
          dataKey="sal"
          type="number"
          xAxisId="sal"
          orientation="top"
          domain={[30, 38]}
          tick={TICK}
          stroke="hsl(var(--border))"
        />
        <YAxis
          dataKey="depth"
          type="number"
          reversed
          domain={[maxDepth, 0]}
          tick={TICK}
          tickFormatter={(v) => `${v}m`}
          stroke="hsl(var(--border))"
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          name="Temperature"
          dataKey="temp"
          xAxisId="temp"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          animationDuration={900}
        />
        <Line
          name="Salinity"
          dataKey="sal"
          xAxisId="sal"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--muted-foreground))" }}
          animationDuration={1100}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Create `TimeSeriesChart.tsx`**

```tsx
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

const TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

export function TimeSeriesChart({
  months,
  values,
  unit,
}: {
  months: string[];
  values: number[];
  unit: string;
}) {
  const rows = months.map((month, i) => ({ month, value: values[i] }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={TICK}
          tickFormatter={(m: string) => m.slice(5)}
          stroke="hsl(var(--border))"
        />
        <YAxis
          tick={TICK}
          tickFormatter={(v: number) => `${v}${unit}`}
          stroke="hsl(var(--border))"
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          name="Monthly mean"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 5 }}
          animationDuration={900}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Create `ComparisonChart.tsx`**

```tsx
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

const TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

export function ComparisonChart({
  target,
  baseline,
}: {
  target: number;
  baseline: number;
}) {
  const rows = [
    { key: "target", label: "Target", value: target },
    { key: "baseline", label: "Baseline", value: baseline },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={TICK} stroke="hsl(var(--border))" />
        <YAxis tick={TICK} tickFormatter={(v) => `${v}°C`} stroke="hsl(var(--border))" domain={[0, 32]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
        <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]} animationDuration={800}>
          {rows.map((r) => (
            <Cell key={r.key} fill={r.key === "target" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 5: Rewrite `VizPanel.tsx`**

Replace the entire file (Plotly is fully removed):

```tsx
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FlaskConical, TriangleAlert, Waves } from "lucide-react";
import type { QueryResponse } from "../types";
import { TrajectoryMap } from "./TrajectoryMap";
import { DepthProfileChart } from "./charts/DepthProfileChart";
import { TimeSeriesChart } from "./charts/TimeSeriesChart";
import { ComparisonChart } from "./charts/ComparisonChart";

export function VizPanel({ response }: { response: QueryResponse | null }) {
  if (!response) {
    return (
      <StateCard
        icon={<Waves className="text-primary" size={22} strokeWidth={1.5} />}
        title="query the floats to render a visualization"
        detail="live dataset: float 2900226 · Bay of Bengal · Oct 2002 – Aug 2004 · 125 profiles"
      />
    );
  }
  return <VizInner response={response} />;
}

function VizInner({ response }: { response: QueryResponse }) {
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
        icon={<TriangleAlert className="text-warning" size={22} strokeWidth={1.5} />}
        title={title}
        detail={detail}
        tone="warning"
      />
    );
  }

  if (type === "trajectory") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="h-full min-h-64"
      >
        <TrajectoryMap
          latitudes={data.latitudes as number[]}
          longitudes={data.longitudes as number[]}
          floatId={data.float_id as string}
        />
      </motion.div>
    );
  }

  if (type === "comparison" && (data.target === null || data.baseline === null)) {
    return (
      <StateCard
        icon={<FlaskConical className="text-warning" size={22} strokeWidth={1.5} />}
        title="insufficient data"
        detail="not enough measurements in this region and period to compare against a baseline"
        tone="warning"
      />
    );
  }

  const title =
    type === "depth_profile"
      ? "depth profile"
      : type === "time_series"
        ? "monthly mean"
        : "comparison";
  const subtitle = `${data.region as string} · ${data.period as string}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex h-full min-h-64 flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <span className="font-mono text-xs text-muted-foreground/70">{subtitle}</span>
      </header>
      <div className="min-h-0 flex-1 p-3">
        {type === "depth_profile" && (
          <DepthProfileChart
            depths={data.depths_m as number[]}
            temps={data.temperatures_c as number[]}
            sals={data.salinities_psu as number[]}
          />
        )}
        {type === "time_series" && (
          <TimeSeriesChart
            months={data.months as string[]}
            values={data.values as number[]}
            unit={data.unit as string}
          />
        )}
        {type === "comparison" && (
          <ComparisonChart
            target={data.target as number}
            baseline={data.baseline as number}
          />
        )}
      </div>
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
      className={`
        flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border px-6 text-center
        ${tone === "warning" ? "border-warning/40 bg-card" : "border-dashed border-border bg-card"}
      `}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/40">
        {icon}
      </div>
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="max-w-xs font-mono text-[13px] leading-relaxed text-muted-foreground/70">
        {detail}
      </p>
    </motion.div>
  );
}
```

Note: `StateCard`'s `icon` prop is typed `ReactNode` (imported at top) — no `React` namespace needed.

- [ ] **Step 6: Verify build + dev (mock mode)**

Run (workdir `frontend`): `npm run build` — clean (if `React.ReactNode` errors, switch to `ReactNode` import as noted).

Run dev in mock mode. Cycle through suggestions; check:
- Depth profile: two lines (teal temp, muted salinity), depth axis inverted (0 top, deeper down).
- Time series: animated line, mono ticks.
- Comparison: teal vs muted bars.
- Refusal / no-data / sparse: themed state cards.
- `plotly.js-dist-min` is no longer imported anywhere (`grep` for `plotly` in `src` should return nothing).

- [ ] **Step 7: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: swap plotly for animated recharts chart cards" }
```

---

### Task 6: TrajectoryMap re-skin

**Files:**
- Modify: `frontend/src/components/TrajectoryMap.tsx`
- Test: `npm run build` + dev check

**Interfaces:**
- Produces: same `TrajectoryMap({ latitudes, longitudes, floatId })` as today.

- [ ] **Step 1: Re-skin `TrajectoryMap.tsx`**

Replace the color constants and surface classes:
```tsx
const PRIMARY = "hsl(var(--primary))";
const MUTED = "hsl(var(--muted-foreground))";
```
Replace the container:
```tsx
<div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card">
  <div ref={containerRef} className="h-full w-full" />
  <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border border-border bg-background/80 px-2 py-1 font-mono text-[13px] text-foreground backdrop-blur">
    float <span className="text-primary">{floatId}</span> · trajectory
  </div>
</div>
```
In the `useEffect`, keep the dark CARTO basemap, but:
- polyline color → `PRIMARY`
- start marker color/fill → `MUTED`
- current marker color/fill → `PRIMARY`, and add a pulsing ring via `L.circleMarker` radius 10 with `{ color: PRIMARY, opacity: 0.3, fill: false }` layered under the current marker to act as the "soft pulsing glow".

Keep everything else identical (map init, tooltip class `float-map-tip`, cleanup).

- [ ] **Step 2: Verify build + dev**

Run (workdir `frontend`): `npm run build` — clean.
Run dev in mock mode and send a trajectory query (3rd suggestion cycles to it): dark map, teal path, glowing current marker, themed chip.

- [ ] **Step 3: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: re-skin trajectory map to theme tokens" }
```

---

### Task 7: ExplainabilityDrawer + ConfidenceBadge re-skin

**Files:**
- Modify: `frontend/src/components/ExplainabilityDrawer.tsx` (full rewrite), `frontend/src/components/ConfidenceBadge.tsx`
- Test: `npm run build` + dev check

**Interfaces:**
- Produces: same props as today — `ExplainabilityDrawer({ info, confidence })`, `ConfidenceBadge({ confidence, note })`.

- [ ] **Step 1: Rewrite `ExplainabilityDrawer.tsx`**

Replace the entire file with a motion-based animated collapsible (deterministic — no extra registry dependency):

```tsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Confidence, Explainability } from "../types";

export function ExplainabilityDrawer({
  info,
  confidence,
}: {
  info: Explainability;
  confidence: Confidence;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-muted-foreground transition-colors hover:text-primary"
      >
        <span className="text-primary">?</span>
        {open ? "How I got this — hide" : "How I got this"}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="inline-block"
        >
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
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-background/70">
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
                <span>
                  floats used:{" "}
                  {info.floats_used.length ? (
                    <span className="text-primary">
                      {info.floats_used.map((f) => (
                        <span
                          key={f}
                          className="mr-1 inline-block rounded border border-border bg-card px-1.5 py-0.5 text-foreground"
                        >
                          {f}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">none</span>
                  )}
                </span>
                <span>
                  readings excluded:{" "}
                  <span className="text-foreground">{info.qc_excluded_count}</span>
                </span>
                {info.time_range_queried && (
                  <span>
                    range: <span className="text-foreground">{info.time_range_queried}</span>
                  </span>
                )}
                <span>
                  confidence:{" "}
                  {confidence === "low" ? (
                    <span className="text-warning">low</span>
                  ) : (
                    <span className="text-primary">high</span>
                  )}
                </span>
              </div>
              {info.sql && (
                <pre className="overflow-x-auto px-4 py-2.5 font-mono text-xs leading-relaxed text-muted-foreground">
                  {info.sql}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Re-skin `ConfidenceBadge.tsx`**

Replace the entire file:
```tsx
import type { Confidence } from "../types";

export function ConfidenceBadge({ confidence, note }: { confidence: Confidence; note: string }) {
  if (confidence !== "low") return null;
  const text = note ? `Low confidence — ${note}` : "Low confidence";
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-warning/50 bg-warning/10 px-2.5 py-0.5 font-mono text-xs text-warning"
      title={text}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning sonar-pulse" />
      {text}
    </span>
  );
}
```

- [ ] **Step 3: Verify build + dev**

Run (workdir `frontend`): `npm run build` — clean.
Run dev in mock mode: open an answer's "How I got this" — smooth height animation, themed SQL/stat rows; low-confidence answers (time series / comparison) show the amber badge.

- [ ] **Step 4: Commit**

```powershell
git add -A; if ($?) { git commit -m "fe: animate explainability drawer and re-skin confidence badge" }
```

---

### Task 8: Cleanup + final verification

**Files:**
- Modify: `frontend/package.json` (remove Plotly), `frontend/src/App.tsx` (final layout classes), `frontend/src/index.css` (verify no orphan tokens)
- Test: `npm run build` + full `npm run dev` checklist

- [ ] **Step 1: Remove Plotly**

Run (workdir `frontend`):
```powershell
npm uninstall plotly.js-dist-min @types/plotly.js
```

- [ ] **Step 2: Migrate remaining layout classes in `App.tsx`**

Replace the `main`/`section`/`aside` borders in `App.tsx`:
```tsx
<main className="flex min-h-0 flex-1 flex-col lg:flex-row">
  <section className="min-h-0 flex-1 lg:border-r lg:border-border">
    <ChatPanel language={language} onLanguageChange={setLanguage} onVizChange={setViz} />
  </section>
  <aside className="min-h-0 flex-1 border-t border-border p-4 lg:border-l lg:border-t-0">
    <VizPanel response={viz} />
  </aside>
</main>
```

- [ ] **Step 3: Prune dead tokens**

`grep` the whole `frontend/src` for old token classes — `grep -rn "abyss\|current-500\|current-300\|bio-\|scan-\|foam-\|text-foam\|bg-abyss\|border-current\|text-bio\|bg-bio\|text-scan\|bg-scan\|text-flag\|bg-flag" frontend/src` (use ripgrep via the `rg` tool). Any hits must be migrated to theme classes (they should all be gone after Tasks 1–7; fix stragglers). The old colors were never re-added to `tailwind.config.js` in this plan, so any leftover class is a no-op silently — fix each hit to its themed equivalent:
- `bg-abyss-950`/`bg-abyss-900`/`bg-abyss-800` → `bg-background`/`bg-card`
- `border-current-500`/`border-current-500/30` → `border-border`
- `text-current-300` → `text-muted-foreground`
- `text-foam-50` → `text-foreground`, `text-foam-200` → `text-muted-foreground`
- `text-bio-400`/`bg-bio-400` → `text-primary`/`bg-primary`
- `text-scan-500`/`bg-scan-500` → `text-warning`/`bg-warning`
- `text-flag-500`/`border-flag-500` → `text-destructive`/`border-destructive`

- [ ] **Step 4: Final build**

Run (workdir `frontend`): `npm run build`
Expected: `tsc --noEmit` clean, `vite build` succeeds, zero Plotly references.

- [ ] **Step 5: Full manual checklist (mock mode)**

Run `npm run dev` with `VITE_USE_MOCK=true` and walk the whole flow — send 7 messages to cycle through every mock state and confirm:
1. Dark themed shell + subtle animated aurora background.
2. Header: wordmark, subtitle, pulsing LIVE badge, language readout.
3. Empty state: animated wave mark, staggered suggestion chips.
4. User bubble (primary fill) → typing indicator → system bubble (card + primary left border).
5. Depth profile: dual-axis recharts card with inverted depth.
6. Trajectory: dark Leaflet map, teal path, glowing current marker.
7. Time series: animated line, mono ticks, amber low-confidence badge.
8. Comparison: bars; sparse variant → "insufficient data" card.
9. Refusal (out-of-scope, no-data): themed state cards + refusal label in chat.
10. "How I got this" drawer animates open with SQL + float chips + stat row.
11. EN/HI segmented control works; composer auto-grows; send button scales.
12. No console errors, no `plotly` references.

- [ ] **Step 6: Commit**

```powershell
git add -A; if ($?) { git commit -m "chore: remove plotly and prune legacy tokens" }
```

---

## Self-Review Notes

- **Spec coverage:** theme/bootstrap (Task 1) → segmented control + header (Task 2) → background (Task 3) → chat (Task 4) → charts/viz swap (Task 5) → trajectory map (Task 6) → drawer + badge (Task 7) → Plotly removal + prune (Task 8). Every spec section (§2–§6) is mapped to a task.
- **Type consistency:** `LanguageToggle`, `DepthProfileChart`, `TimeSeriesChart`, `ComparisonChart`, `TrajectoryMap`, `ExplainabilityDrawer`, `ConfidenceBadge` keep the exact prop signatures consumed in later/earlier tasks.
- **PowerShell:** all 21st.dev install commands use `$env:API_KEY_21ST`.