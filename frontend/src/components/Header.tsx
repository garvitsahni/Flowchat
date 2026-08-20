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
