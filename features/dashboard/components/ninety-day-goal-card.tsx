import Link from "next/link";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DashboardNinetyDayGoalData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getNinetyDayGoalData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function NinetyDayGoalCardBody({
  result,
}: {
  result: ModuleResult<DashboardNinetyDayGoalData>;
}) {
  return (
    <WidgetCard title="90-Day Goal" icon={<Flag className="h-4 w-4" />}>
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.cycle === null ? (
        <EmptyState
          title="No active cycle"
          description="Create your first 90-day outcome."
          action={
            <Button size="sm" asChild>
              <Link href="/plan-90-days">Start a 90-Day Cycle</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text-primary">{result.data.cycle.name}</p>
          <ProgressBar
            value={result.data.cycle.progress}
            ariaLabel={`${result.data.cycle.name} progress`}
          />
        </div>
      )}
    </WidgetCard>
  );
}

export async function NinetyDayGoalCard() {
  const result = await safeModule(getNinetyDayGoalData);
  return <NinetyDayGoalCardBody result={result} />;
}
