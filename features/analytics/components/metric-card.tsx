import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_CHIP_CLASSES } from "@/lib/design/category-colors";
import type { AnalyticsMetric } from "@/features/analytics/types";
import { getMetricAccent } from "../metric-accent";
import { MetricChart } from "./metric-chart";

function formatHeadline(metric: AnalyticsMetric): string {
  if (metric.current === null) return "—";
  if (metric.unit === "percent" || metric.unit === "score") return `${metric.current}%`;
  if (metric.unit === "minutes") return `${metric.current} min`;
  return String(metric.current);
}

export function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const { icon: Icon, color } = getMetricAccent(metric.key);

  return (
    <Card>
      <CardHeader className="flex flex-row items-baseline justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-(--radius-token-sm)",
              color === "danger" ? "bg-danger/15 text-danger" : CATEGORY_CHIP_CLASSES[color],
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {metric.label}
        </CardTitle>
        <span className="text-lg font-semibold text-text-primary">{formatHeadline(metric)}</span>
      </CardHeader>
      <CardContent>
        <MetricChart metric={metric} color={color} />
      </CardContent>
    </Card>
  );
}
