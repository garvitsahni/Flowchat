import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryResponse } from "../types";
import { TrajectoryMap } from "./TrajectoryMap";

interface PlotlyNewPlot {
  (
    root: HTMLElement,
    data: unknown[],
    layout?: Partial<Record<string, unknown>>,
    config?: Partial<Record<string, unknown>>
  ): unknown;
}

export function VizPanel({ response }: { response: QueryResponse | null }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [plotly, setPlotly] = useState<PlotlyNewPlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("plotly.js-dist-min")
      .then((mod) => (mod as unknown as { newPlot: PlotlyNewPlot }).newPlot)
      .then((newPlot) => {
        if (!cancelled) setPlotly(() => newPlot);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!response) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center rounded-lg border border-dashed border-current-500/40">
        <p className="font-mono text-xs text-current-300">
          query the floats to render a visualization
        </p>
      </div>
    );
  }

  return <VizInner plotly={plotly} response={response} chartRef={chartRef} />;
}

function VizInner({
  plotly,
  response,
  chartRef,
}: {
  plotly: PlotlyNewPlot | null;
  response: QueryResponse;
  chartRef: React.RefObject<HTMLDivElement>;
}) {
  const { chart_type: type, chart_data: data } = response;

  const renderPlotly = useCallback(() => {
    if (!chartRef.current || !plotly) return;
    if (type !== "depth_profile" && type !== "time_series" && type !== "comparison") return;
    const { traces, layout, config } = buildPlot(type, data);
    plotly(chartRef.current, traces, layout, config);
  }, [plotly, type, data]);

  useEffect(() => {
    renderPlotly();
  }, [renderPlotly]);

  useEffect(() => {
    return () => {
      if (chartRef.current) chartRef.current.innerHTML = "";
    };
  }, [type]);

  if (type === "none") return null;
  if (type === "trajectory") {
    return (
      <TrajectoryMap
        latitudes={data.latitudes as number[]}
        longitudes={data.longitudes as number[]}
        floatId={data.float_id as string}
      />
    );
  }

  return (
    <div className="h-full w-full rounded-lg border border-current-500/40 bg-abyss-900 p-3">
      <div ref={chartRef} className="h-full w-full" />
    </div>
  );
}

interface Build {
  traces: unknown[];
  layout: Partial<Record<string, unknown>>;
  config: Partial<Record<string, unknown>>;
}

const SONAR_GRID = "rgba(45, 225, 194, 0.08)";
const TEAL = "#2DE1C2";
const MUTED = "#3A7CA5";
const FOAM = "#EAF6F6";

function buildPlot(type: string, data: Record<string, unknown>): Build {
  const config = { displayModeBar: false, responsive: true };
  const layoutBase = {
    paper_bgcolor: "#0A1F2E",
    plot_bgcolor: "#0A1F2E",
    font: { color: FOAM, family: "IBM Plex Mono, monospace", size: 12 },
    margin: { l: 52, r: 24, t: 40, b: 44 },
    xaxis: { gridcolor: SONAR_GRID, zerolinecolor: SONAR_GRID },
    yaxis: { gridcolor: SONAR_GRID, zerolinecolor: SONAR_GRID },
  };

  if (type === "depth_profile") {
    const depths = data.depths_m as number[];
    const temps = data.temperatures_c as number[];
    const sals = data.salinities_psu as number[];
    const maxDepth = Math.max(...depths);
    return {
      traces: [
        {
          x: temps,
          y: depths,
          name: "Temperature",
          type: "scatter",
          mode: "lines+markers",
          line: { color: TEAL, width: 2 },
          marker: { color: TEAL, size: 4 },
          hovertemplate: "%{y:.0f} m · %{x:.1f}°C<extra></extra>",
        },
        {
          x: sals,
          y: depths,
          name: "Salinity",
          type: "scatter",
          mode: "lines+markers",
          line: { color: MUTED, width: 2 },
          marker: { color: MUTED, size: 4 },
          xaxis: "x2",
          hovertemplate: "%{y:.0f} m · %{x:.2f} PSU<extra></extra>",
        },
      ],
      layout: {
        ...layoutBase,
        title: { text: `${data.region as string} · ${data.period as string}`, font: { size: 12, color: FOAM } },
        xaxis: { ...layoutBase.xaxis, title: "°C", side: "bottom", range: [0, 32] },
        xaxis2: { ...layoutBase.xaxis, title: "PSU", overlaying: "x", side: "top", range: [30, 38], showgrid: false },
        yaxis: { ...layoutBase.yaxis, title: "Depth (m)", autorange: "reversed", range: [maxDepth, 0] },
        legend: { orientation: "h", y: 1.2, x: 0, font: { size: 11 } },
      },
      config,
    };
  }

  if (type === "time_series") {
    const months = data.months as string[];
    const values = data.values as number[];
    const unit = data.unit as string;
    return {
      traces: [
        {
          x: months,
          y: values,
          name: "Avg",
          type: "scatter",
          mode: "lines+markers",
          line: { color: TEAL, width: 2 },
          marker: { color: TEAL, size: 5 },
          hovertemplate: "%{x} · %{y:.1f} " + unit + "<extra></extra>",
        },
      ],
      layout: {
        ...layoutBase,
        title: { text: `${data.region as string} · monthly mean`, font: { size: 12, color: FOAM } },
        yaxis: { ...layoutBase.yaxis, title: unit },
      },
      config,
    };
  }

  // comparison
  const target = data.target as number | null;
  const baseline = data.baseline as number | null;
  const region = data.region as string;
  const labels = ["Target"];
  const values = [target];
  const colors = [TEAL];
  if (baseline !== null) {
    labels.push("Baseline");
    values.push(baseline);
    colors.push(MUTED);
  }
  return {
    traces: [
      {
        x: labels,
        y: values,
        type: "bar",
        marker: { color: colors },
        hovertemplate: "%{x}: %{y:.1f}°C<extra></extra>",
      },
    ],
    layout: {
      ...layoutBase,
      title: { text: `${region} · comparison`, font: { size: 12, color: FOAM } },
      yaxis: { ...layoutBase.yaxis, title: "°C", range: [0, 32] },
    },
    config,
  };
}