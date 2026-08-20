function Block({ k, v }: { k: string; v: string }) {
  return (
    <div className="border border-border bg-[#0D0F0F] px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60">{k}</div>
      <div className="mt-0.5 font-mono text-[13px] text-foreground">{v}</div>
    </div>
  );
}

export function DataContext({
  region,
  period,
  observations,
  quality,
}: {
  region?: string;
  period?: string;
  observations?: number;
  quality?: number;
}) {
  const blocks: { k: string; v: string }[] = [
    { k: "region", v: region ?? "\u2014" },
    { k: "period", v: period ?? "\u2014" },
    ...(observations ? [{ k: "observations", v: observations.toLocaleString() }] : []),
    ...(quality ? [{ k: "quality", v: `${quality}% usable` }] : []),
  ];
  return (
    <section className="mt-3">
      <h3 className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">Data Context</h3>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {blocks.map((b) => (
          <Block key={b.k} {...b} />
        ))}
      </div>
    </section>
  );
}