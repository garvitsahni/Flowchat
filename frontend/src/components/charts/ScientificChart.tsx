import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import type { QueryResponse, TimeSeriesData } from "../../types";
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
  payload?: { payload: { value: number; period: string } }[];
  label?: string | number;
  metric: string;
  unit: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="border-l-2 border-primary bg-[#0D0F0F] px-3 py-2.5 font-mono text-xs text-foreground shadow-xl" style={{ borderColor: color }}>
      <div className="mb-1.5 text-muted-foreground">{label}</div>
      <div className="flex justify-between gap-4 py-0.5">
        <span className="text-muted-foreground">{metric}</span>
        <span style={{ color }} className="font-semibold">{p.value?.toFixed(1)} {unit}</span>
      </div>
    </div>
  );
}

function StatBadge({ label, value, unit = "" }: { label: string; value: number | string | null; unit?: string }) {
  if (value === null || value === undefined) return null;
  return (
    <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
      <span className="text-foreground">{label}</span>
      <span className="font-semibold">{value}{unit}</span>
    </span>
  );
}

interface ChartPoint {
  period: string;
  value: number | null;
  trend?: number | null;
}

export function ScientificChart({ response }: { response: QueryResponse }) {
  const [metric, setMetric] = useState<DemoMetric>("temperature");
  const [scale, setScale] = useState<DemoScale>("monthly");

  const data = response.chart_data as TimeSeriesData;
  const isRealData = Array.isArray(data.months) && Array.isArray(data.values);

  let points: ChartPoint[];
  let cfg: any;
  let title: string;
  let region: string;

  if (isRealData) {
    const isTemp = data.unit === "°C";
    const color = isTemp ? "#2dd4bf" : "#4da3ff";
    cfg = {
      label: isTemp ? "Temperature" : "Salinity",
      unit: data.unit,
      color,
      domain: ["dataMin", "dataMax"],
      ticks: undefined,
    };
    const months = data.months;
    const values = data.values;
    const trend = data.trend ?? null;

    points = months.map((m, i) => ({
      period: m,
      value: values[i],
      trend: trend ? trend[i] : undefined,
    }));
    title = "Time Series";
    region = data.region ?? "Indian Ocean";
  } else {
    cfg = DEMO_METRICS[metric];
    points = cfg[scale].map((p: any) => ({ period: p.period, value: p.value, trend: undefined }));
    title = `${scale === "monthly" ? "Monthly Mean" : "Annual Mean"}`;
    region = (response.chart_data as any).region ?? "Indian Ocean";
  }

  const level = response.confidence === "low" ? ("low" as const) : ("high" as const);

  const handleExport = () => {
    if (isRealData) {
      toast.error("Export not available for live queries");
      return;
    }
    downloadCsv(exportCsv(metric, scale), `floatchat_${metric}_${scale}.csv`);
    toast.success("Export ready", { description: `${metric} · ${scale} · CSV downloaded` });
  };

  const hasValidData = points.some(p => p.value !== null && p.value !== undefined);

  return (
    <div className="flex h-full min-h-0 flex-col border border-border bg-[#111313]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-foreground">{title}</span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">{region}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {points.filter(p => p.value !== null).length} observations
          </span>
          {data.stats?.value && (
            <>
              <StatBadge label="Mean" value={data.stats.value.mean?.toFixed(1)} unit={cfg.unit} />
              <StatBadge label="Min" value={data.stats.value.min?.toFixed(1)} unit={cfg.unit} />
              <StatBadge label="Max" value={data.stats.value.max?.toFixed(1)} unit={cfg.unit} />
            </>
          )}
          <DataQuality level={level} />
        </div>
      </header>
      <div className="min-h-0 flex-1 p-2.5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 10, bottom: 0, left: 0 }} key={isRealData ? "real" : `${metric}-${scale}`}>
            <defs>
              <linearGradient id="scientificGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
              </linearGradient>
              {points.some(p => p.trend !== undefined) && (
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              )}
            </defs>
            <CartesianGrid stroke="#1E2020" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="period"
              tick={TICK}
              tickFormatter={(p: string) => (!isRealData && scale === "monthly" ? p.slice(-2) : p)}
              stroke="#1E2020"
              tickLine={false}
              axisLine={{ stroke: "#1E2020" }}
              padding={{ left: 8, right: 8 }}
            />
            <YAxis
              domain={cfg.domain}
              ticks={cfg.ticks}
              tick={TICK}
              tickFormatter={(v: number) => typeof v === 'number' ? `${v.toFixed(1)}${cfg.unit}` : v}
              stroke="#1E2020"
              tickLine={false}
              axisLine={false}
              width={46}
            />
            <Tooltip
              content={<ScientificTooltip metric={cfg.label} unit={cfg.unit} color={cfg.color} />}
              cursor={{ stroke: "rgba(45,212,191,0.35)", strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              fill="url(#scientificGradient)"
              strokeWidth={2}
              dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: cfg.color, strokeWidth: 0, className: "chart-gradient-glow" }}
              animationDuration={900}
              isAnimationActive
            />
            {points.some(p => p.trend !== undefined) && hasValidData && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                animationDuration={900}
                isAnimationActive
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {!isRealData && (
        <ChartControls
          metric={metric}
          onMetricChange={setMetric}
          scale={scale}
          onScaleChange={setScale}
          onExport={handleExport}
        />
      )}
    </div>
  );
}