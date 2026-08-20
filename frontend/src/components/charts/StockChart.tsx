import { useMemo } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

// MOCK: illustrative seeded data for a UI demo only - NOT real AMZN quotes and
// NOT connected to the ARGO float dataset. Deterministic seed, so the chart
// renders identically on every load.

const N = 330; // full synthetic history (200-SMA needs >= 200 bars)
const START = 210; // display slice start (>= 199 so both SMAs are defined)
const WINDOW = 120; // displayed bars

const COLORS = {
  grid: "#171717",
  close: "#F5F5F5",
  sma60: "#4DA3FF",
  sma200: "#D9A441",
  muted: "#777777",
  up: "#20D98A",
  down: "#F05252",
};

const TICKS = [179.28, 170.63, 161.99, 153.34, 144.69];

const TICK = {
  fill: COLORS.muted,
  fontSize: 11,
  fontFamily: "IBM Plex Mono, monospace",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Point {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  sma60: number;
  sma200: number;
}

function businessDates(count: number, end: string): string[] {
  const d = new Date(`${end}T12:00:00Z`);
  const dates: string[] = [];
  while (dates.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return dates.reverse();
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function buildSeries(): Point[] {
  const rnd = mulberry32(2900226);
  const dates = businessDates(N, "2026-08-19");
  const closes: number[] = [];

  for (let i = 0; i < N; i++) {
    const k = (i - START) / (WINDOW - 1);
    const target = k < 0 ? 144.69 : 144.69 + (179.28 - 144.69) * k;
    const noise = (rnd() - 0.5) * 2.4;
    const wiggle = 2.6 * Math.sin(i / 9) + 1.4 * Math.sin(i / 23);
    let close = target + noise + wiggle;
    if (rnd() < 0.03) close -= 4 + rnd() * 4;
    if (rnd() < 0.03) close += 3 + rnd() * 4;
    if (i === N - 1) close = 179.28;
    closes.push(close);
  }

  const sma = (windowSize: number): (number | null)[] =>
    closes.map((_, i) => {
      if (i < windowSize - 1) return null;
      let sum = 0;
      for (let j = i - windowSize + 1; j <= i; j++) sum += closes[j];
      return sum / windowSize;
    });
  const sma60 = sma(60);
  const sma200 = sma(200);

  return closes
    .map((close, i) => {
      const open = i === 0 ? close : closes[i - 1];
      const high = Math.max(open, close) + (rnd() * 0.7 + 0.1);
      const low = Math.min(open, close) - (rnd() * 0.7 + 0.1);
      return {
        date: dates[i],
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        sma60: sma60[i] == null ? 0 : +sma60[i].toFixed(2),
        sma200: sma200[i] == null ? 0 : +sma200[i].toFixed(2),
      };
    })
    .slice(START, START + WINDOW);
}

function StockTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload?: Point }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const rows = [
    { name: "Price", value: p.close, color: COLORS.close },
    { name: "60 SMA", value: p.sma60, color: COLORS.sma60 },
    { name: "200 SMA", value: p.sma200, color: COLORS.sma200 },
  ];
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2.5 font-mono text-xs text-foreground shadow-xl">
      <div className="mb-2 text-muted-foreground">{label}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
          <span className="text-muted-foreground">{r.name}</span>
          <span className="text-foreground">${r.value.toFixed(2)}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-[#222] pt-1.5 text-[11px] text-muted-foreground">
        O {p.open.toFixed(2)} / H {p.high.toFixed(2)} / L {p.low.toFixed(2)}
      </div>
    </div>
  );
}
export function StockChart() {
  const points = useMemo(buildSeries, []);
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const change = last.close - prev.close;
  const pct = (change / prev.close) * 100;
  const up = change >= 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
            AMZN
          </span>
          <span className="font-mono text-xs text-muted-foreground">Amazon.com Inc.</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS.sma60 }} />
            60 SMA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS.sma200 }} />
            200 SMA
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 10, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tick={TICK}
              tickFormatter={formatDate}
              stroke={COLORS.grid}
              minTickGap={56}
              tickCount={7}
            />
            <YAxis
              orientation="right"
              domain={[140, 183]}
              ticks={TICKS}
              tick={TICK}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              stroke={COLORS.grid}
              width={64}
            />
            <Tooltip
              content={<StockTooltip />}
              cursor={{ stroke: "#3f3f46", strokeDasharray: "3 3" }}
            />
            <Line
              name="Price"
              type="monotone"
              dataKey="close"
              stroke={COLORS.close}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={900}
            />
            <Line
              name="60 SMA"
              type="monotone"
              dataKey="sma60"
              stroke={COLORS.sma60}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              animationDuration={900}
            />
            <Line
              name="200 SMA"
              type="monotone"
              dataKey="sma200"
              stroke={COLORS.sma200}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              animationDuration={900}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <footer className="flex items-center gap-3 border-t border-border px-4 py-2.5">
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
          ${last.close.toFixed(2)}
        </span>
        <span className="font-mono text-xs text-muted-foreground">today</span>
        <span
          className="flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs"
          style={{
            color: up ? COLORS.up : COLORS.down,
            background: up ? "#20D98A1A" : "#F052521A",
          }}
        >
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {up ? "+" : "-"}${Math.abs(change).toFixed(2)} · {up ? "+" : "-"}
          {Math.abs(pct).toFixed(2)}%
        </span>
      </footer>
    </div>
  );
}