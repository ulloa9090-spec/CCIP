import { Award } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { DashboardWeeklyScoreData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getWeeklyScoreData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

/**
 * Never color-alone (design system principle): the ring's tone is always
 * paired with this same-meaning text label underneath it.
 */
function scoreTone(score: number): { tone: "success" | "warning" | "danger"; label: string } {
  if (score >= 75) return { tone: "success", label: "On track" };
  if (score >= 50) return { tone: "warning", label: "Needs attention" };
  return { tone: "danger", label: "Behind" };
}

export function WeeklyScoreCardBody({
  result,
}: {
  result: ModuleResult<DashboardWeeklyScoreData>;
}) {
  return (
    <WidgetCard title="Weekly Score" icon={<Award className="h-4 w-4" />} accent="rose">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.score === null ? (
        <EmptyState title="Not enough data" description="Score appears after your first week." />
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-2">
          <ProgressRing
            value={result.data.score}
            label="Weekly Execution Score"
            tone={scoreTone(result.data.score).tone}
          />
          <span className="text-caption text-text-secondary">
            {scoreTone(result.data.score).label}
          </span>
        </div>
      )}
    </WidgetCard>
  );
}

export async function WeeklyScoreCard() {
  const result = await safeModule(getWeeklyScoreData);
  return <WeeklyScoreCardBody result={result} />;
}
