interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  stroke?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div 
      className="rounded-md border border-border/50 bg-[#0D0F0F]/80 px-3 py-2.5 font-mono text-xs text-foreground shadow-xl backdrop-blur-md"
      style={{
        borderLeftColor: payload[0]?.color ?? payload[0]?.stroke ?? "hsl(var(--primary))",
        borderLeftWidth: "3px"
      }}
    >
      {label != null && <div className="mb-1.5 text-muted-foreground/90 uppercase tracking-wider text-[10px]">{label}</div>}
      <div className="flex flex-col gap-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: p.color ?? p.stroke ?? "hsl(var(--primary))", filter: `drop-shadow(0 0 3px ${p.color ?? p.stroke ?? "hsl(var(--primary))"})` }}
              />
              <span className="text-muted-foreground/80">{p.name}</span>
            </div>
            <span className="font-semibold tracking-tight text-foreground">
              {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}