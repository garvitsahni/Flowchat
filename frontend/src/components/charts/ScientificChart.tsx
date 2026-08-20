import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { QueryResponse } from "../../types";
import {
  DEMO_METRICS,
  exportCsv,
  type DemoMetric,
  type DemoScale,
} from "../../lib/demo";
import { DataQuality } from "../chat/DataQuality";
import { ChartControls } from "./ChartControls";

const TICK = {
  fill: "#8b8b8b",
  fontSize: 10,
  fontFamily: "IBM Plex Mono, monospace",
};

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ScientificTooltip({
  active,
  payload,
  label,
  metric,
  unit,
  color,
}: {
  active?: boolean;
  payload?: { payload: { value: number; observations: number; quality: number } }[];
  label?: string | number;
  metric: string;
  unit: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const rows = [
    { name: metric, value: `${p.value.toFixed(1)} ${unit}`, color },
    { name: "Observations", value: p.observations.toLocaleString(), color: "#8b8b8b" },
    { name: "Quality", value: `${p.quality}%`, color: p.quality >= 80 ? "#34d399" : p.quality >= 65 ? "#22d3ee" : "#fbbf24" },
  ];
  return (
    <div className="border-l-2 border-primary bg-[#0D0F0F] px-3 py-2.5 font-mono text-xs text-foreground shadow-xl" style={{ borderColor: color }}>
      <div className="mb-1.5 text-muted-foreground">{label}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="text-muted-foreground">{r.name}</span>
          <span style={{ color: r.color }} className="font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ScientificChart({ response }: { response: QueryResponse }) {
  const [metric, setMetric] = useState<DemoMetric>("temperature");
  const [scale, setScale] = useState<DemoScale>("monthly");
  const cfg = DEMO_METRICS[metric];
  const points = cfg[scale];
  const region = (response.chart_data.region as string | undefined) ?? "Indian Ocean";
  const level = response.confidence === "low" ? ("low" as const) : ("high" as const);
  const title = `${scale === "monthly" ? "Monthly Mean" : "Annual Mean"}`;

  const handleExport = () => {
    downloadCsv(exportCsv(metric, scale), `floatchat_${metric}_${scale}.csv`);
    toast.success("Export ready", { description: `${metric} · ${scale} · CSV downloaded` });
  };

  return (
    <div className="flex h-full min-h-0 flex-col border border-border bg-[#111313]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground">{title}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{region}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {points.length} observations
          </span>
          <DataQuality level={level} />
        </div>
      </header>
      <div className="min-h-0 flex-1 p-2.5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: 0 }} key={`${metric}-${scale}`}>
            <CartesianGrid stroke="#1E2020" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="period"
              tick={TICK}
              tickFormatter={(p: string) => (scale === "monthly" ? p.slice(-2) : p)}
              stroke="#1E2020"
              tickLine={false}
              axisLine={{ stroke: "#1E2020" }}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              domain={cfg.domain}
              ticks={cfg.ticks}
              tick={TICK}
              tickFormatter={(v: number) => `${v}${cfg.unit}`}
              stroke="#1E2020"
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip
              content={<ScientificTooltip metric={cfg.label} unit={cfg.unit} color={cfg.color} />}
              cursor={{ stroke: "rgba(45,212,191,0.35)", strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              strokeWidth={2}
              dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: cfg.color, strokeWidth: 0 }}
              animationDuration={900}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartControls
        metric={metric}
        onMetricChange={setMetric}
        scale={scale}
        onScaleChange={setScale}
        onExport={handleExport}
      />
    </div>
  );
}
