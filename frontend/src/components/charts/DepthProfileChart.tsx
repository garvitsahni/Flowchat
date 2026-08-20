import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

/** Round up to a "nice" ceiling for the depth axis */
function niceMax(v: number): number {
  if (v <= 0) return 10;
  const steps = [10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000, 5000, 6000];
  for (const s of steps) {
    if (v <= s) return s;
  }
  return Math.ceil(v / 1000) * 1000;
}

interface DepthRow {
  depth: number;
  temp: number | null;
  sal: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function DepthTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as DepthRow | undefined;
  if (!row) return null;
  return (
    <div
      className="rounded-md border border-border/50 bg-[#0D0F0F]/80 px-3 py-2.5 font-mono text-xs text-foreground shadow-xl backdrop-blur-md"
      style={{ borderLeftColor: "hsl(var(--primary))", borderLeftWidth: "3px" }}
    >
      <div className="mb-1.5 text-muted-foreground/90 uppercase tracking-wider text-[10px]">
        {row.depth.toFixed(1)} m
      </div>
      <div className="flex flex-col gap-1.5">
        {row.temp != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
              <span className="text-muted-foreground/80">Temperature</span>
            </div>
            <span className="font-semibold tracking-tight text-foreground">{row.temp.toFixed(2)} °C</span>
          </div>
        )}
        {row.sal != null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(160 60% 50%)" }} />
              <span className="text-muted-foreground/80">Salinity</span>
            </div>
            <span className="font-semibold tracking-tight text-foreground">{row.sal.toFixed(2)} PSU</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DepthProfileChart({
  data,
}: {
  data: {
    depths_m: number[];
    temperatures_c: number[];
    salinities_psu: number[];
    stats?: {
      temperature_c: { min: number; max: number; mean: number; count: number } | null;
      salinity_psu: { min: number; max: number; mean: number; count: number } | null;
      depth_m: { min: number; max: number; mean: number; count: number } | null;
    };
  }
}) {
  const { depths_m, temperatures_c, salinities_psu } = data;

  // Build rows and sort by depth ascending for a proper top-to-bottom profile.
  const rows: DepthRow[] = depths_m
    .map((depth, i) => ({
      depth,
      temp: temperatures_c[i] ?? null,
      sal: salinities_psu[i] ?? null,
    }))
    .filter((r) => r.depth != null)
    .sort((a, b) => a.depth - b.depth);

  const depthCeil = niceMax(Math.max(...rows.map((r) => r.depth), 1));
  const hasTemp = rows.some((r) => r.temp != null);
  const hasSal = rows.some((r) => r.sal != null);

  // Compute temp/sal domains for the two X-axes
  const tempValues = rows.map((r) => r.temp).filter((v): v is number => v != null);
  const salValues = rows.map((r) => r.sal).filter((v): v is number => v != null);
  const tempDomain: [number, number] = tempValues.length
    ? [Math.floor(Math.min(...tempValues) - 1), Math.ceil(Math.max(...tempValues) + 1)]
    : [0, 30];
  const salDomain: [number, number] = salValues.length
    ? [Math.floor((Math.min(...salValues) - 0.5) * 10) / 10, Math.ceil((Math.max(...salValues) + 0.5) * 10) / 10]
    : [33, 36];

  const showDots = rows.length <= 80;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        layout="vertical"
        data={rows}
        margin={{ top: 8, right: 12, bottom: 4, left: 8 }}
      >
        <defs>
          <linearGradient id="tempLineGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" horizontal={false} />

        {/* Depth on Y-axis (reversed: 0m top, max bottom) */}
        <YAxis
          dataKey="depth"
          type="number"
          reversed
          domain={[0, depthCeil]}
          tickCount={6}
          tick={TICK}
          tickFormatter={(v: number) => `${Math.round(v)}m`}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
          width={52}
        />

        {/* Temperature X-axis (bottom) */}
        {hasTemp && (
          <XAxis
            xAxisId="temp"
            type="number"
            orientation="bottom"
            domain={tempDomain}
            tickCount={6}
            tick={TICK}
            tickFormatter={(v: number) => `${v.toFixed(1)}°C`}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            label={{
              value: "Temperature",
              position: "insideBottom",
              offset: -2,
              style: { ...TICK, fontSize: 10, fill: "hsl(var(--primary))" },
            }}
          />
        )}

        {/* Salinity X-axis (top) */}
        {hasSal && (
          <XAxis
            xAxisId="sal"
            type="number"
            orientation="top"
            domain={salDomain}
            tickCount={6}
            tick={TICK}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
            stroke="hsl(var(--border))"
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
            label={{
              value: "Salinity (PSU)",
              position: "insideTop",
              offset: -2,
              style: { ...TICK, fontSize: 10, fill: "hsl(160 60% 50%)" },
            }}
          />
        )}

        <Tooltip content={<DepthTooltip />} cursor={{ stroke: "hsl(var(--muted))", strokeDasharray: "3 3" }} />

        {/* Temperature line */}
        {hasTemp && (
          <Line
            type="monotone"
            name="Temperature"
            dataKey="temp"
            xAxisId="temp"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={showDots ? { r: 2, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))", strokeWidth: 1.5 } : false}
            activeDot={{ r: 4, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
            animationDuration={900}
            isAnimationActive={rows.length <= 200}
            connectNulls
          />
        )}

        {/* Salinity line */}
        {hasSal && (
          <Line
            type="monotone"
            name="Salinity"
            dataKey="sal"
            xAxisId="sal"
            stroke="hsl(160 60% 50%)"
            strokeWidth={2}
            dot={showDots ? { r: 2, fill: "hsl(var(--background))", stroke: "hsl(160 60% 50%)", strokeWidth: 1.5 } : false}
            activeDot={{ r: 4, fill: "hsl(160 60% 50%)", stroke: "hsl(var(--background))", strokeWidth: 2 }}
            animationDuration={1100}
            isAnimationActive={rows.length <= 200}
            connectNulls
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}