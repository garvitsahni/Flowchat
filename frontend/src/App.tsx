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