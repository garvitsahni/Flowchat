import { cn } from "../../lib/utils";

const STYLES = {
  high: { dot: "bg-emerald-400", text: "text-emerald-400", border: "border-emerald-400/30" },
  medium: { dot: "bg-cyan-400", text: "text-cyan-300", border: "border-cyan-400/30" },
  low: { dot: "bg-amber-400", text: "text-amber-400", border: "border-amber-400/30" },
} as const;

export function DataQuality({ level }: { level: "high" | "medium" | "low" }) {
  const s = STYLES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em]",
        s.border,
        s.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {level}
    </span>
  );
}