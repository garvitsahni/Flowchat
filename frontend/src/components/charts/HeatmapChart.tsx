import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

export function HeatmapChart({
  data,
}: {
  data: { month: string; depth_bin: number; avg_temp?: number; avg_salinity?: number }[];
}) {
  const hasTemp = data.some(d => d.avg_temp !== undefined);
  const zKey = hasTemp ? "avg_temp" : "avg_salinity";
  const zName = hasTemp ? "Temperature" : "Salinity";
  const zUnit = hasTemp ? "°C" : " PSU";

  // Calculate min/max for color scale
  const values = data.map(d => d[zKey] as number).filter(v => v !== undefined);
  const minZ = Math.min(...values);
  const maxZ = Math.max(...values);

  // Depth domain
  const depths = data.map(d => d.depth_bin);
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);

  // Simple color scale: cold (blue) to hot (red) for temp, or light to dark for salinity
  const getColor = (value: number) => {
    if (value === undefined) return "transparent";
    const ratio = (value - minZ) / (maxZ - minZ || 1);
    if (hasTemp) {
      // Blue -> Teal -> Yellow -> Red
      const hue = (1 - ratio) * 240; // 240 is blue, 0 is red
      return `hsl(${hue}, 80%, 50%)`;
    } else {
      // Light blue to dark blue for salinity
      const l = 90 - (ratio * 50);
      return `hsl(210, 80%, ${l}%)`;
    }
  };

  const CustomShape = (props: any) => {
    const { cx, cy, fill } = props;
    // Render a rectangle centered at cx, cy
    return (
      <rect
        x={cx - 15}
        y={cy - 10}
        width={30}
        height={20}
        fill={fill}
        stroke="#111313"
        strokeWidth={1}
        rx={2}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="border border-border bg-[#0D0F0F] px-3 py-2.5 font-mono text-xs text-foreground shadow-xl">
          <div className="mb-1.5 text-muted-foreground">{dataPoint.month.slice(0, 7)}</div>
          <div className="flex justify-between gap-4 py-0.5">
            <span className="text-muted-foreground">Depth</span>
            <span className="font-semibold">{dataPoint.depth_bin}m</span>
          </div>
          <div className="flex justify-between gap-4 py-0.5">
            <span className="text-muted-foreground">{zName}</span>
            <span className="font-semibold" style={{ color: getColor(dataPoint[zKey]) }}>
              {dataPoint[zKey]?.toFixed(1)}{zUnit}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format month to 'YY-MM
  const formatMonth = (tickItem: string) => tickItem.slice(2, 7);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis
          type="category"
          dataKey="month"
          name="Month"
          tick={TICK}
          tickFormatter={formatMonth}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          type="number"
          dataKey="depth_bin"
          name="Depth"
          domain={[maxDepth + 20, Math.max(0, minDepth - 20)]}
          tick={TICK}
          tickFormatter={(v) => `${v}m`}
          stroke="hsl(var(--border))"
          tickLine={false}
          axisLine={false}
        />
        <ZAxis type="number" dataKey={zKey} range={[0, 0]} name={zName} />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data} shape={<CustomShape />}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry[zKey] as number)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
