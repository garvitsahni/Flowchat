import { useState } from "react";
import type { Language, QueryResponse } from "./types";
import { ChatPanel } from "./components/ChatPanel";
import { VizPanel } from "./components/VizPanel";

export default function App() {
  const [language, setLanguage] = useState<Language>("en");
  const [viz, setViz] = useState<QueryResponse | null>(null);

  return (
    <div className="flex h-screen w-screen flex-col bg-abyss-950 text-foam-50">
      <header className="flex items-center justify-between border-b border-current-500/30 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight text-foam-50">
            Float<span className="text-bio-400">Chat</span>
          </h1>
          <span className="hidden font-mono text-xs tracking-widest text-current-300 sm:inline">
            DEEP-SEA INSTRUMENT PANEL · INDIAN OCEAN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-mono text-xs text-current-300">
            <span className="h-1.5 w-1.5 rounded-full bg-bio-400 sonar-pulse" />
            LIVE · float 2900226
          </span>
          <span className="font-mono text-xs text-current-300">
            {language === "en" ? "en · english" : "hi · हिन्दी"}
          </span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 lg:border-r lg:border-current-500/30">
          <ChatPanel
            language={language}
            onLanguageChange={setLanguage}
            onVizChange={setViz}
          />
        </section>

        <aside className="min-h-0 flex-1 border-t border-current-500/30 p-4 lg:border-l lg:border-t-0">
          <VizPanel response={viz} />
        </aside>
      </main>
    </div>
  );
}