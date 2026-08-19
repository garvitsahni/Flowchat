import { useState } from "react";
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
        className="flex items-center gap-1.5 font-mono text-xs tracking-wide text-current-300 transition-colors hover:text-bio-400"
      >
        <span className="text-bio-400">?</span>
        {open ? "How I got this — hide" : "How I got this"}
        <span className={`inline-block transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div className="mt-2 overflow-hidden rounded-lg border border-current-500/40 bg-abyss-950/70">
          <div className="flex flex-wrap items-center gap-3 border-b border-current-500/30 px-4 py-2.5 font-mono text-xs text-foam-200">
            <span>
              floats used:{" "}
              {info.floats_used.length ? (
                <span className="text-bio-400">
                  {info.floats_used.map((f) => (
                    <span key={f} className="mr-1 inline-block rounded bg-abyss-800 px-1.5 py-0.5">
                      {f}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-foam-200/60">none</span>
              )}
            </span>
            <span>
              readings excluded: <span className="text-foam-50">{info.qc_excluded_count}</span>
            </span>
            {info.time_range_queried && <span>range: <span className="text-foam-50">{info.time_range_queried}</span></span>}
            <span>
              confidence:{" "}
              {confidence === "low" ? (
                <span className="text-scan-500">low</span>
              ) : (
                <span className="text-bio-400">high</span>
              )}
            </span>
          </div>
          {info.sql && (
            <pre className="overflow-x-auto px-4 py-2.5 font-mono text-xs leading-relaxed text-current-300">
              {info.sql}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
