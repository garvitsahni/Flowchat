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

export function TimeSeriesChart({
  months,
  values,
  unit,
}: {
  months: string[];
  values: number[];
  unit: string;
}) {
  const rows = months.map((month, i) => ({ month, value: values[i] }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={TICK}
          tickFormatter={(m: string) => m.slice(5)}
          stroke="hsl(var(--border))"
        />
        <YAxis
          tick={TICK}
          tickFormatter={(v: number) => `${v}${unit}`}
          stroke="hsl(var(--border))"
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          name="Monthly mean"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3, fill: "hsl(var(--primary))" }}
          activeDot={{ r: 5 }}
          animationDuration={900}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}