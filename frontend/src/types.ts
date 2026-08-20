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
  explanations?: Record<string, string>;
}

// Chart data types matching backend viz.py
export interface FloatPosition {
  float_id: string;
  latitude: number;
  longitude: number;
}

export interface RegionMap {
  floats: FloatPosition[];
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
}

export interface DepthProfileData {
  type: "depth_profile";
  depths_m: number[];
  temperatures_c: number[];
  salinities_psu: number[];
  region?: string;
  period?: string;
  stats?: {
    temperature_c: { min: number; max: number; mean: number; count: number } | null;
    salinity_psu: { min: number; max: number; mean: number; count: number } | null;
    depth_m: { min: number; max: number; mean: number; count: number } | null;
  };
  meta?: {
    y_axis: string;
    x_axes: string[];
    y_reversed: boolean;
  };
  map?: RegionMap | null;
}

export interface TrajectoryData {
  type: "trajectory";
  latitudes: number[];
  longitudes: number[];
  dates: string[];
  float_id: string;
  region?: string;
  period?: string;
  stats?: {
    lat: { min: number; max: number; mean: number; count: number } | null;
    lon: { min: number; max: number; mean: number; count: number } | null;
  };
  meta?: {
    bounds: {
      min_lat: number | null;
      max_lat: number | null;
      min_lon: number | null;
      max_lon: number | null;
    };
  };
}

export interface TimeSeriesData {
  type: "time_series";
  months: string[];
  values: number[];
  unit: string;
  label: string;
  region?: string;
  period?: string;
  stats?: {
    value: { min: number; max: number; mean: number; count: number } | null;
  };
  trend?: number[];
  meta?: {
    x_axis: string;
    y_axis: string;
    has_trend: boolean;
  };
  map?: RegionMap | null;
}

export interface ComparisonData {
  type: "comparison";
  target: number | null;
  baseline: number | null;
  delta: number | null;
  region?: string;
  period?: string;
  stats?: {
    target: number | null;
    baseline: number | null;
  };
  meta?: {
    y_axis: string;
    labels: string[];
  };
  map?: RegionMap | null;
}

export interface HeatmapTimeDepthData {
  type: "heatmap";
  subtype: "time_depth";
  grid: { month: string; depth_bin: number; value: number }[];
  months: string[];
  depth_bins: number[];
  unit: string;
  label: string;
  region?: string;
  period?: string;
  stats?: {
    value: { min: number; max: number; mean: number; count: number } | null;
  };
  meta?: {
    x_axis: string;
    y_axis: string;
    y_reversed: boolean;
    color_scale: string;
  };
  map?: RegionMap | null;
}

export interface HeatmapOceanData {
  type: "heatmap";
  subtype: "ocean";
  points: {
    lat: number;
    lon: number;
    temperature_c?: number;
    salinity_psu?: number;
    depth_m?: number;
  }[];
  primary_variable: "temperature_c" | "salinity_psu" | null;
  unit: string;
  label: string;
  region?: string;
  period?: string;
  stats?: {
    value: { min: number; max: number; mean: number; count: number } | null;
    count: number;
  };
  meta?: {
    bounds: {
      min_lat: number | null;
      max_lat: number | null;
      min_lon: number | null;
      max_lon: number | null;
    };
    color_scale: string;
  };
}

export interface NoneData {
  type: "none";
}

export type HeatmapData = HeatmapTimeDepthData | HeatmapOceanData;

export type ChartData = DepthProfileData | TrajectoryData | TimeSeriesData | ComparisonData | HeatmapData | NoneData;

export interface QueryResponse {
  answer_text: string;
  language: Language;
  chart_type: ChartType;
  chart_data: ChartData;
  confidence: Confidence;
  confidence_note: string;
  refusal_reason?: RefusalReason;
  explainability: Explainability;
}