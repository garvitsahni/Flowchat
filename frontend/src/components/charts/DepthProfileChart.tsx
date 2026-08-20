import {
  CartesianGrid,
  Area,
  AreaChart,
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
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <defs>
          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="salGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="temp"
          type="number"
          xAxisId="temp"
          orientation="bottom"
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={TICK}
          tickFormatter={(v) => `${v.toFixed(0)}°`}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <XAxis
          dataKey="sal"
          type="number"
          xAxisId="sal"
          orientation="top"
          domain={["dataMin - 0.5", "dataMax + 0.5"]}
          tick={TICK}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          dataKey="depth"
          type="number"
          reversed
          domain={[maxDepth, 0]}
          tick={TICK}
          tickFormatter={(v) => `${v}m`}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--muted))", strokeDasharray: "3 3" }} />
        <Area
          type="monotone"
          name="Temperature"
          dataKey="temp"
          xAxisId="temp"
          stroke="hsl(var(--primary))"
          fill="url(#tempGradient)"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2, className: "chart-gradient-glow" }}
          animationDuration={900}
        />
        <Area
          type="monotone"
          name="Salinity"
          dataKey="sal"
          xAxisId="sal"
          stroke="hsl(var(--muted-foreground))"
          fill="url(#salGradient)"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--background))", stroke: "hsl(var(--muted-foreground))", strokeWidth: 2 }}
          activeDot={{ r: 5, fill: "hsl(var(--muted-foreground))", stroke: "hsl(var(--background))", strokeWidth: 2, className: "chart-gradient-glow" }}
          animationDuration={1100}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}