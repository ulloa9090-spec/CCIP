import Link from "next/link";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardWeeklyPrioritiesData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getWeeklyPrioritiesData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function WeeklyPrioritiesCardBody({
  result,
}: {
  result: ModuleResult<DashboardWeeklyPrioritiesData>;
}) {
  return (
    <WidgetCard title="Weekly Priorities" icon={<ListChecks className="h-4 w-4" />} accent="cyan">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.priorities.length === 0 ? (
        <EmptyState
          title="No priorities set"
          description="Select this week's Top 3."
          action={
            <Button size="sm" asChild>
              <Link href="/tasks">Set Weekly Priorities</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {result.data.priorities.map((task) => (
            <li key={task.id} className="text-sm text-text-secondary">
              {task.title}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export async function WeeklyPrioritiesCard() {
  const result = await safeModule(getWeeklyPrioritiesData);
  return <WeeklyPrioritiesCardBody result={result} />;
}
