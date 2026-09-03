export interface SeriesPoint {
  date: string;
  value: number | null;
}

export interface AnalyticsSeries {
  label: string;
  points: SeriesPoint[];
}

export type MetricUnit = "percent" | "count" | "minutes" | "score";

export interface AnalyticsMetric {
  key: string;
  label: string;
  unit: MetricUnit;
  granularity: "day" | "week";
  series: AnalyticsSeries[];
  /** The most recent non-null value, for the metric card's headline number. */
  current: number | null;
}

export const ANALYTICS_RANGES = [7, 30, 90, 365] as const;
export type AnalyticsRangeDays = (typeof ANALYTICS_RANGES)[number];

export interface AnalyticsData {
  rangeDays: AnalyticsRangeDays;
  metrics: AnalyticsMetric[];
}
