import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  const [showDelta, setShowDelta] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowDelta(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const delta = target - baseline;
  const isWarmer = delta > 0;
  
  const rows = [
    { key: "target", label: "Target", value: target },
    { key: "baseline", label: "Baseline", value: baseline },
  ];

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 30, bottom: 4, left: 16 }}>
          <defs>
            <linearGradient id="targetGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="baselineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" horizontal={false} />
          <XAxis type="number" tick={TICK} tickFormatter={(v) => `${v}°C`} stroke="hsl(var(--border))" domain={[0, "dataMax + 2"]} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
          <YAxis type="category" dataKey="label" tick={TICK} stroke="hsl(var(--border))" tickLine={false} axisLine={false} width={60} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.1)" }} />
          <Bar dataKey="value" name="Value" radius={[0, 6, 6, 0]} animationDuration={800} barSize={40}>
            {rows.map((r) => (
              <Cell key={r.key} fill={r.key === "target" ? "url(#targetGradient)" : "url(#baselineGradient)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {showDelta && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-4 top-4 flex flex-col items-end pointer-events-none"
        >
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">Difference</div>
          <div 
            className="flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-md"
            style={{ 
              borderColor: isWarmer ? "rgba(251, 191, 36, 0.4)" : "rgba(56, 189, 248, 0.4)",
              backgroundColor: "rgba(13, 15, 15, 0.8)"
            }}
          >
            <div 
              className="font-mono text-base font-bold"
              style={{ color: isWarmer ? "#fbbf24" : "#38bdf8" }}
            >
              {isWarmer ? "+" : ""}{delta.toFixed(1)}°C
            </div>
            <div className="text-xs uppercase tracking-wider text-foreground">
              {isWarmer ? "warmer" : "cooler"}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}