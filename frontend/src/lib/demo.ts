// MOCK: illustrative demo series for UI demonstration only.
// Temperature monthly values mirror the real float 2900226 TIME_SERIES response
// values; salinity/pressure/oxygen and yearly series are plausible placeholder
// series (NOT real measurements) so the chart controls are demonstrable.

export type DemoMetric = "temperature" | "salinity" | "pressure" | "oxygen";
export type DemoScale = "monthly" | "yearly";

export interface DemoPoint {
  period: string; // "2003-01" | "2002" | ...
  value: number;
  observations: number;
  quality: number; // 0-100 usable %
}

export interface DemoMetricConfig {
  label: string;
  unit: string;
  color: string;
  monthly: DemoPoint[];
  yearly: DemoPoint[];
  domain: [number, number];
  ticks: number[];
}

const MONTHLY_TEMP: DemoPoint[] = [
  { period: "2003-01", value: 20.7, observations: 152, quality: 66 },
  { period: "2003-02", value: 21.4, observations: 148, quality: 68 },
  { period: "2003-03", value: 22.8, observations: 161, quality: 70 },
  { period: "2003-04", value: 24.1, observations: 157, quality: 71 },
  { period: "2003-05", value: 25.6, observations: 169, quality: 69 },
  { period: "2003-06", value: 26.3, observations: 163, quality: 70 },
  { period: "2003-07", value: 27.0, observations: 150, quality: 72 },
  { period: "2003-08", value: 27.4, observations: 184, quality: 86 },
];

const SALINITY_MONTHLY = [33.2, 33.4, 33.6, 33.1, 32.8, 32.5, 32.2, 31.9];
const PRESSURE_MONTHLY = [452, 455, 448, 458, 462, 460, 454, 449];
const OXYGEN_MONTHLY = [195, 192, 188, 181, 175, 169, 164, 158];

const YEAR_LABELS = ["2002", "2003", "2004"];

const withMeta = (values: number[], observations: number[], quality: number[]): DemoPoint[] =>
  values.map((v, i) => ({
    period: MONTHLY_TEMP[i].period,
    value: v,
    observations: observations[i],
    quality: quality[i],
  }));

const YEARLY_TEMP: DemoPoint[] = [
  { period: "2002", value: 23.1, observations: 1210, quality: 70 },
  { period: "2003", value: 24.3, observations: 1284, quality: 72 },
  { period: "2004", value: 24.9, observations: 902, quality: 74 },
];

const yearlyFor = (_base: number, values: number[], obs: number[]): DemoPoint[] =>
  values.map((v, i) => ({
    period: YEAR_LABELS[i],
    value: v,
    observations: obs[i],
    quality: 70 + i * 2,
  }));

export const DEMO_METRICS: Record<DemoMetric, DemoMetricConfig> = {
  temperature: {
    label: "Temperature",
    unit: "\u00B0C",
    color: "#2dd4bf",
    monthly: MONTHLY_TEMP,
    yearly: YEARLY_TEMP,
    domain: [0, 28],
    ticks: [0, 7, 14, 21, 28],
  },
  salinity: {
    label: "Salinity",
    unit: "PSU",
    color: "#4da3ff",
    monthly: withMeta(SALINITY_MONTHLY, MONTHLY_TEMP.map((p) => p.observations), MONTHLY_TEMP.map((p) => p.quality)),
    yearly: yearlyFor(33.0, [33.0, 33.2, 33.1], [1210, 1284, 902]),
    domain: [30, 36],
    ticks: [30, 32, 34, 36],
  },
  pressure: {
    label: "Pressure",
    unit: "dbar",
    color: "#d9a441",
    monthly: withMeta(PRESSURE_MONTHLY, MONTHLY_TEMP.map((p) => p.observations), MONTHLY_TEMP.map((p) => p.quality)),
    yearly: yearlyFor(452, [452, 455, 451], [1210, 1284, 902]),
    domain: [440, 470],
    ticks: [440, 450, 460, 470],
  },
  oxygen: {
    label: "Oxygen",
    unit: "\u00B5mol/kg",
    color: "#20d98a",
    monthly: withMeta(OXYGEN_MONTHLY, MONTHLY_TEMP.map((p) => p.observations), MONTHLY_TEMP.map((p) => p.quality)),
    yearly: yearlyFor(185, [185, 172, 168], [1210, 1284, 902]),
    domain: [150, 200],
    ticks: [150, 170, 190],
  },
};

export function getRegionContext(
  region: string
): { observations: number; quality: number } | undefined {
  if (region !== "Bay of Bengal") return undefined;
  const monthly = DEMO_METRICS.temperature.monthly;
  const observations = monthly.reduce((s, p) => s + p.observations, 0);
  const quality = Math.round(
    monthly.reduce((s, p) => s + p.quality, 0) / monthly.length
  );
  return { observations, quality };
}

export function exportCsv(metric: DemoMetric, scale: DemoScale): string {
  const cfg = DEMO_METRICS[metric];
  const points = cfg[scale];
  const header = `metric,unit,scale,period,value,observations,quality_pct`;
  const rows = points.map(
    (p) =>
      `${cfg.label},${cfg.unit},${scale},${p.period},${p.value},${p.observations},${p.quality}`
  );
  return [header, ...rows].join("\n");
}
