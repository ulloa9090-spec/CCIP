import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsMetric } from "@/features/analytics/types";
import { MetricChart } from "./metric-chart";

function formatHeadline(metric: AnalyticsMetric): string {
  if (metric.current === null) return "—";
  if (metric.unit === "percent" || metric.unit === "score") return `${metric.current}%`;
  if (metric.unit === "minutes") return `${metric.current} min`;
  return String(metric.current);
}

export function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2">
        <CardTitle>{metric.label}</CardTitle>
        <span className="text-lg font-semibold text-text-primary">{formatHeadline(metric)}</span>
      </CardHeader>
      <CardContent>
        <MetricChart metric={metric} />
      </CardContent>
    </Card>
  );
}
