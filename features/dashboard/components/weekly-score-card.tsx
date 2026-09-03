import { Award } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { DashboardWeeklyScoreData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getWeeklyScoreData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function WeeklyScoreCardBody({
  result,
}: {
  result: ModuleResult<DashboardWeeklyScoreData>;
}) {
  return (
    <WidgetCard title="Weekly Score" icon={<Award className="h-4 w-4" />}>
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.score === null ? (
        <EmptyState title="Not enough data" description="Score appears after your first week." />
      ) : (
        <div className="flex justify-center py-2">
          <ProgressRing value={result.data.score} label="Weekly Execution Score" />
        </div>
      )}
    </WidgetCard>
  );
}

export async function WeeklyScoreCard() {
  const result = await safeModule(getWeeklyScoreData);
  return <WeeklyScoreCardBody result={result} />;
}
