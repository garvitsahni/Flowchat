const QUERIES = [
  "Show monthly temperature trend",
  "Compare 2002 vs 2003",
  "Which month was hottest?",
  "Show float coverage",
];

export function RelatedQueries({
  onSelect,
  disabled,
}: {
  onSelect: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="mt-3">
      <h3 className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60">Related Queries</h3>
      <div className="flex flex-col items-start gap-0.5">
        {QUERIES.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="group flex items-center gap-2 px-1 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
          >
            <span className="text-muted-foreground/40 transition-colors group-hover:text-primary/60">{String(i + 1).padStart(2, "0")}</span>
            <span className="border-b border-transparent transition-colors group-hover:border-primary/40">{q}</span>
          </button>
        ))}
      </div>
    </section>
  );
}