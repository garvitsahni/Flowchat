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
        <span className="text-primary">\u2304</span>
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