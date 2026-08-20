export type Language = "en" | "hi";
export type ChartType =
  | "depth_profile"
  | "trajectory"
  | "time_series"
  | "comparison"
  | "heatmap"
  | "none";
export type Confidence = "high" | "low";
export type RefusalReason = "" | "out_of_scope" | "no_data" | "unsafe";

export interface Explainability {
  sql: string;
  floats_used: string[];
  qc_excluded_count: number;
  time_range_queried: string;
}

export interface QueryResponse {
  answer_text: string;
  language: Language;
  chart_type: ChartType;
  chart_data: Record<string, unknown>;
  confidence: Confidence;
  confidence_note: string;
  refusal_reason?: RefusalReason;
  explainability: Explainability;
}
