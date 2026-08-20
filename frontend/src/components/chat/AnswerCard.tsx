import type { QueryResponse, TimeSeriesData, HeatmapData, ChartData, ChartType } from "../../types";
import { getRegionContext } from "../../lib/demo";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { DataContext } from "./DataContext";
import { EvidencePanel } from "./EvidencePanel";

function isTimeSeries(data: ChartData): data is TimeSeriesData {
  return data.type === "time_series";
}

function isHeatmap(data: ChartData): data is HeatmapData {
  return data.type === "heatmap";
}

function isNone(data: ChartData): data is { type: "none" } {
  return data.type === "none";
}

function calcLabel(response: QueryResponse): string {
  switch (response.chart_type) {
    case "time_series": return "monthly mean of temperature over valid readings";
    case "depth_profile": return "mean over all valid depth levels";
    case "comparison": return "annual mean vs baseline";
    case "trajectory": return "surface position tracking";
    default: return "aggregation over valid readings";
  }
}

function getHeadlineGlossKey(chartType: ChartType): string | null {
  switch (chartType) {
    case "depth_profile":
    case "trajectory":
      return "floats_used";
    case "time_series":
    case "heatmap":
      return "readings";
    case "comparison":
      return "calculation";
    default:
      return null;
  }
}

function highlightNumbers(text: string): (string | JSX.Element)[] {
  return text.split(/(\d+(?:\.\d+)?(?:\u00B0C|%| PSU| dbar| \u00B5mol\/kg)?)/g).map((part, i) =>
    /\d/.test(part) ? (
      <span key={i} className="font-semibold text-primary">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function AnswerCard({ text, response }: { text: string; response: QueryResponse }) {
  const data = response.chart_data;
  const region = (!isNone(data) && data.region) as string | undefined;
  
  let months: string[] | undefined;
  if (isTimeSeries(data)) {
    months = data.months;
  } else if (isHeatmap(data) && data.subtype === "time_depth") {
    months = data.months;
  }
  
  const period =
    (!isNone(data) ? data.period : undefined) ??
    (months && months.length >= 2 ? `${months[0]} \u2192 ${months[months.length - 1]}` : undefined);
  const ctx = getRegionContext(region ?? "");
  return (
    <article className="w-full max-w-[92%]">
      <div className="border border-border bg-[#111313]">
        <p className="px-3.5 py-3 text-[15px] leading-relaxed text-foreground">{highlightNumbers(text)}</p>
        {(() => {
          const key = getHeadlineGlossKey(response.chart_type);
          const gloss = key ? response.explainability.explanations?.[key] : null;
          return gloss ? (
            <div className="mt-2 mb-1 px-3.5 text-[12px] leading-relaxed text-muted-foreground/70 font-mono">
              {gloss}
            </div>
          ) : null;
        })()}
        <div className="px-3.5 pb-3">
          <ConfidenceBadge confidence={response.confidence} note={response.confidence_note} />
        </div>
        <div className="border-t border-border px-3.5 py-2.5">
          <DataContext
            region={region}
            period={period}
            observations={ctx?.observations}
            quality={ctx?.quality}
          />
          <EvidencePanel
            info={response.explainability}
            region={region}
            observations={ctx?.observations}
            quality={ctx?.quality}
            calculation={calcLabel(response)}
          />
        </div>
      </div>
    </article>
  );
}