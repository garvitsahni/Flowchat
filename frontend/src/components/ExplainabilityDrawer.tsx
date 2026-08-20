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