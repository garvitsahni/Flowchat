import type { Confidence } from "../types";

export function ConfidenceBadge({ confidence, note }: { confidence: Confidence; note: string }) {
  if (confidence !== "low") return null;
  const text = note ? `Low confidence — ${note}` : "Low confidence";
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-scan-500/50 bg-scan-500/10 px-2.5 py-0.5 font-mono text-xs text-scan-500"
      title={text}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-scan-500 sonar-pulse" />
      {text}
    </span>
  );
}