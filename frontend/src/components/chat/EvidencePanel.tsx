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
  const rows: { label: string; value: string; explanationKey?: string }[] = [
    {
      label: "data source",
      value: info.floats_used.length ? `ARGO float(s): ${info.floats_used.join(", ")}` : "no float attributed",
      explanationKey: "floats_used",
    },
    ...(observations
      ? [{ label: "observations", value: observations.toLocaleString(), explanationKey: "readings" }]
      : []),
    {
      label: "date range",
      value: info.time_range_queried || "\u2014",
      explanationKey: "time_range",
    },
    ...(region ? [{ label: "region", value: region, explanationKey: undefined }] : []),
    {
      label: "quality checks",
      value: `${info.qc_excluded_count.toLocaleString()} readings excluded (QC flag 4 at ingestion)`,
      explanationKey: "qc_excluded",
    },
    ...(calculation
      ? [{ label: "calculation", value: calculation, explanationKey: "calculation" }]
      : []),
    ...(quality
      ? [{ label: "usable readings", value: `${quality}%`, explanationKey: "usable" }]
      : []),
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
                {rows.map(({ label, value, explanationKey }) => (
                  <div key={label} className="font-mono text-xs">
                    <span className="mr-2 text-muted-foreground/60">{label}:</span>
                    <span className="text-foreground">{value}</span>
                    {explanationKey && info.explanations?.[explanationKey] && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground/70 leading-relaxed">
                        {info.explanations[explanationKey]}
                      </div>
                    )}
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