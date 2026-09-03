import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getAnalyticsData } from "@/features/analytics/queries";
import { getHabitTimeSettings } from "@/features/habits/queries";
import { ANALYTICS_RANGES, type AnalyticsRangeDays } from "@/features/analytics/types";
import { MetricCard, RangeSelector } from "@/features/analytics/components";

function parseRange(value: string | undefined): AnalyticsRangeDays {
  const n = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(n) ? (n as AnalyticsRangeDays) : 30;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const { weekStartsOn } = await getHabitTimeSettings();
  const data = await getAnalyticsData(range, weekStartsOn);

  const hasAnyData = data.metrics.some((m) => m.current !== null);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Analytics"
        description="Task completion, habit consistency, focus time, and Weekly Execution Score trends."
      />
      <div className="flex flex-col gap-4 p-6">
        <RangeSelector active={range} />

        {!hasAnyData ? (
          <EmptyState
            icon={<BarChart3 className="h-8 w-8" />}
            title="Not enough data yet"
            description="Analytics populate once you have tasks, habits, and at least one Weekly Review."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.metrics.map((m) => (
              <MetricCard key={m.key} metric={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
