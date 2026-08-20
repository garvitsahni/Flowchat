import { StockChart } from "@/components/charts/StockChart";

export function StockChartDemo() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-card text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-64 w-96 rounded-full bg-muted blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
              Stock Chart
            </h1>
            <span className="font-mono text-xs tracking-widest text-muted-foreground">
              recharts · DEMO
            </span>
          </div>
          <a
            href="#/"
            className="rounded-lg border border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            ← back
          </a>
        </header>

        <div className="h-[420px]">
          <StockChart />
        </div>

        <p className="mt-4 font-mono text-xs text-muted-foreground/70">
          seeded daily close · 120 bars · 60/200-day SMA · illustrative mock data, not live market quotes
        </p>
      </div>
    </div>
  );
}