import { useEffect, useState } from "react";
import type { Language, QueryResponse } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { VizPanel } from "./components/VizPanel";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { LanguageToggle } from "./components/LanguageToggle";
import { PromptInputDemo } from "./demo/PromptInputDemo";
import { DemoHub } from "./demo/DemoHub";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Particles } from "@/components/ui/particles";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";

const TELEMETRY = [
  "float 2900226",
  "bay of bengal",
  "oct 2002 – aug 2004",
  "125 profiles",
  "guardrail: select-only",
  "qc flag 4 filtered at ingestion",
  "model gemini 3.6 flash",
];

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [viz, setViz] = useState<QueryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (route === "#/demo/prompt") {
    return <PromptInputDemo />;
  }
  if (route === "#/demo") {
    return <DemoHub />;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
        <AuroraBackground
          variant="ocean"
          className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        />
        <Particles
          className="absolute inset-0 -z-10 opacity-40"
          quantity={45}
          size={0.5}
          staticity={40}
          color="#2dd4bf"
        />
        <div className="flex h-full flex-col">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex cursor-default items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary sonar-pulse" />
                    LIVE · float 2900226
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Streaming ARGO float · 125 profiles · Bay of Bengal
                </TooltipContent>
              </Tooltip>
              <span className="hidden items-center gap-1.5 font-mono text-xs text-muted-foreground md:flex">
                profiles
                <NumberTicker value={125} className="text-primary" />
              </span>
              <LanguageToggle language={language} onChange={setLanguage} />
            </div>
          </header>

          <Marquee
            pauseOnHover
            className="[--duration:30s] border-b border-border bg-card/50 py-1.5"
          >
            {TELEMETRY.map((t) => (
              <span
                key={t}
                className="mx-8 flex items-center gap-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                <span className="h-1 w-1 rounded-full bg-primary/60" />
                {t}
              </span>
            ))}
          </Marquee>

          <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <section className="min-h-0 flex-1 lg:border-r lg:border-border">
              <ChatPanel
                language={language}
                busy={busy}
                onBusyChange={setBusy}
                onVizChange={setViz}
              />
            </section>

            <aside className="min-h-0 flex-1 border-t border-border p-4 lg:border-l lg:border-t-0">
              <VizPanel response={viz} loading={busy} />
            </aside>
          </main>
        </div>
        <Toaster position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}