import { Download } from "lucide-react";
import type { DemoMetric, DemoScale } from "../../lib/demo";
import { cn } from "../../lib/utils";

const METRICS: { id: DemoMetric; label: string }[] = [
  { id: "temperature", label: "Temperature" },
  { id: "salinity", label: "Salinity" },
  { id: "pressure", label: "Pressure" },
  { id: "oxygen", label: "Oxygen" },
];

const SCALES: { id: DemoScale; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors",
        active
          ? "border-primary/60 bg-primary/5 text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function ChartControls({
  metric,
  onMetricChange,
  scale,
  onScaleChange,
  onExport,
}: {
  metric: DemoMetric;
  onMetricChange: (m: DemoMetric) => void;
  scale: DemoScale;
  onScaleChange: (s: DemoScale) => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
      <div className="flex flex-wrap items-center gap-0.5">
        {METRICS.map((m) => (
          <SegButton key={m.id} active={metric === m.id} onClick={() => onMetricChange(m.id)}>
            {m.label}
          </SegButton>
        ))}
      </div>
      <div className="flex items-center gap-0.5">
        {SCALES.map((s) => (
          <SegButton key={s.id} active={scale === s.id} onClick={() => onScaleChange(s.id)}>
            {s.label}
          </SegButton>
        ))}
        <span className="mx-1 h-3 w-px bg-border" />
        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-primary"
        >
          <Download size={12} /> Export
        </button>
      </div>
    </div>
  );
}
