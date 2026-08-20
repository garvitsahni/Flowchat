import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

const TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

export function ComparisonChart({
  target,
  baseline,
}: {
  target: number;
  baseline: number;
}) {
  const rows = [
    { key: "target", label: "Target", value: target },
    { key: "baseline", label: "Baseline", value: baseline },
  ];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={TICK} stroke="hsl(var(--border))" />
        <YAxis tick={TICK} tickFormatter={(v) => `${v}°C`} stroke="hsl(var(--border))" domain={[0, 32]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
        <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]} animationDuration={800}>
          {rows.map((r) => (
            <Cell key={r.key} fill={r.key === "target" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}