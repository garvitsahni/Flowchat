import {
  CartesianGrid,
  Line,
  LineChart,
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

export function DepthProfileChart({
  depths,
  temps,
  sals,
}: {
  depths: number[];
  temps: number[];
  sals: number[];
}) {
  const rows = depths.map((depth, i) => ({ depth, temp: temps[i], sal: sals[i] }));
  const maxDepth = Math.max(...depths, 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="temp"
          type="number"
          xAxisId="temp"
          orientation="bottom"
          domain={[0, 32]}
          tick={TICK}
          tickFormatter={(v) => `${v}°`}
          stroke="hsl(var(--border))"
        />
        <XAxis
          dataKey="sal"
          type="number"
          xAxisId="sal"
          orientation="top"
          domain={[30, 38]}
          tick={TICK}
          stroke="hsl(var(--border))"
        />
        <YAxis
          dataKey="depth"
          type="number"
          reversed
          domain={[maxDepth, 0]}
          tick={TICK}
          tickFormatter={(v) => `${v}m`}
          stroke="hsl(var(--border))"
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          name="Temperature"
          dataKey="temp"
          xAxisId="temp"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          animationDuration={900}
        />
        <Line
          name="Salinity"
          dataKey="sal"
          xAxisId="sal"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--muted-foreground))" }}
          animationDuration={1100}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}