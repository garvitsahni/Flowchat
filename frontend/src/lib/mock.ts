// MOCK responses matching the locked §4 contract exactly (see backend/app/schemas.py).
// Marked mock by design — swap for live /query via VITE_USE_MOCK=false. Shapes mirror
// backend/app/viz.py keys so the UI renders identically against either source.

import type { QueryResponse } from "../types";

const DEPTH_PROFILE: QueryResponse = {
  answer_text:
    "Across 2475 depth levels in the Bay of Bengal, temperature ranged from 6.1°C to 30.4°C.",
  language: "en",
  chart_type: "depth_profile",
  chart_data: {
    type: "depth_profile",
    depths_m: [0, 50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000],
    temperatures_c: [28.9, 28.6, 26.1, 19.8, 13.4, 9.6, 7.2, 6.3, 6.1, 6.2, 6.5],
    salinities_psu: [33.4, 33.7, 34.9, 35.2, 35.3, 35.1, 35.0, 35.0, 35.1, 35.1, 35.1],
    region: "Bay of Bengal",
    period: "2002-10-24 to 2004-08-04",
  },
  confidence: "high",
  confidence_note: "",
  explainability: {
    sql: "SELECT m.depth_m, m.temperature_c, m.salinity_psu FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.float_id = '2900226' AND m.is_valid = TRUE ORDER BY m.depth_m",
    floats_used: ["2900226"],
    qc_excluded_count: 554,
    time_range_queried: "2002-10-24 to 2004-08-04",
  },
};

const TRAJECTORY: QueryResponse = {
  answer_text:
    "Float 2900226 tracked 125 surface positions from 2002-10-24 to 2004-08-04.",
  language: "en",
  chart_type: "trajectory",
  chart_data: {
    type: "trajectory",
    latitudes: [6.0, 6.3, 6.8, 7.4, 8.1, 8.9, 9.6, 10.2, 11.0, 11.8, 12.5],
    longitudes: [85.0, 85.4, 86.1, 86.8, 87.3, 87.9, 88.4, 88.9, 89.3, 89.7, 90.1],
    dates: [
      "2002-10-24",
      "2002-12-02",
      "2003-01-15",
      "2003-02-20",
      "2003-04-01",
      "2003-05-10",
      "2003-06-18",
      "2003-07-25",
      "2003-09-01",
      "2003-10-09",
      "2003-11-16",
    ],
    float_id: "2900226",
  },
  confidence: "high",
  confidence_note: "",
  explainability: {
    sql: "SELECT p.latitude, p.longitude, p.profile_date FROM argo_profiles p WHERE p.float_id = '2900226' ORDER BY p.profile_date",
    floats_used: ["2900226"],
    qc_excluded_count: 0,
    time_range_queried: "2002-10-24 to 2004-08-04",
  },
};

const TIME_SERIES: QueryResponse = {
  answer_text:
    "Temperature in Bay of Bengal rose from 20.7°C (2003-01) to 27.4°C (2003-08). Limited float coverage.",
  language: "en",
  chart_type: "time_series",
  chart_data: {
    type: "time_series",
    months: ["2003-01", "2003-02", "2003-03", "2003-04", "2003-05", "2003-06", "2003-07", "2003-08"],
    values: [20.7, 21.4, 22.8, 24.1, 25.6, 26.3, 27.0, 27.4],
    unit: "°C",
    region: "Bay of Bengal",
  },
  confidence: "low",
  confidence_note:
    "limited float coverage and a high proportion of readings failed quality checks",
  explainability: {
    sql: "SELECT DATE_TRUNC('month', p.profile_date) AS month, AVG(m.temperature_c) AS avg_temp FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = 'Bay of Bengal' AND p.profile_date >= '2003-01-01' AND m.is_valid = TRUE GROUP BY month ORDER BY month",
    floats_used: ["2900226"],
    qc_excluded_count: 554,
    time_range_queried: "2003-01-01 to 2004-08-04",
  },
};

const COMPARISON: QueryResponse = {
  answer_text:
    "2003 in the Bay of Bengal averaged 25.3°C versus a 24.1°C baseline (+1.2°C). Limited float coverage.",
  language: "en",
  chart_type: "comparison",
  chart_data: {
    type: "comparison",
    target: 25.3,
    baseline: 24.1,
    delta: 1.2,
    region: "Bay of Bengal",
    period: "2003",
  },
  confidence: "low",
  confidence_note: "limited float coverage",
  explainability: {
    sql: "SELECT AVG(m.temperature_c) AS target_avg FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = 'Bay of Bengal' AND p.profile_date >= '2003-01-01' AND p.profile_date < '2004-01-01' AND m.is_valid = TRUE",
    floats_used: ["2900226"],
    qc_excluded_count: 554,
    time_range_queried: "2003-01-01 to 2003-12-31",
  },
};

const SPARSE_DATA: QueryResponse = {
  answer_text: "Insufficient data to compare against a baseline.",
  language: "en",
  chart_type: "comparison",
  chart_data: {
    type: "comparison",
    target: null,
    baseline: null,
    delta: null,
    region: "Arabian Sea",
    period: "2003",
  },
  confidence: "low",
  confidence_note: "Limited float coverage.",
  explainability: {
    sql: "SELECT AVG(m.temperature_c) AS target_avg FROM argo_measurements m JOIN argo_profiles p ON m.profile_id = p.profile_id WHERE p.region = 'Arabian Sea' AND p.profile_date >= '2003-01-01' AND p.profile_date < '2004-01-01' AND m.is_valid = TRUE",
    floats_used: [],
    qc_excluded_count: 0,
    time_range_queried: "2003-01-01 to 2003-12-31",
  },
};

const OUT_OF_SCOPE: QueryResponse = {
  answer_text: "This dataset covers the Indian Ocean region only.",
  language: "en",
  chart_type: "none",
  chart_data: {},
  confidence: "high",
  confidence_note: "",
  explainability: {
    sql: "",
    floats_used: [],
    qc_excluded_count: 0,
    time_range_queried: "",
  },
};

const RESPONSES: QueryResponse[] = [
  DEPTH_PROFILE,
  TRAJECTORY,
  TIME_SERIES,
  COMPARISON,
  SPARSE_DATA,
  OUT_OF_SCOPE,
];

let cursor = 0;

export async function askMock(_question: string): Promise<QueryResponse> {
  const answer = RESPONSES[cursor % RESPONSES.length];
  cursor += 1;
  await new Promise((r) => setTimeout(r, 700));
  return answer;
}
