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