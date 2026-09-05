import Link from "next/link";
import { Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardTodayData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getTodayData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

/** Pure render given a resolved module result — shared by the real fetch
 * path (TodayCard) and the dev demo preview, so they can never drift. */
export function TodayCardBody({ result }: { result: ModuleResult<DashboardTodayData> }) {
  return (
    <WidgetCard title="Today" icon={<Sunrise className="h-4 w-4" />} accent="blue">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.mostImportantTask === null && result.data.topThree.length === 0 ? (
        <EmptyState
          title="Nothing planned for today yet"
          description="Set today's Most Important Task or capture something with Quick Add."
          action={
            <Button size="sm" asChild>
              <Link href="/today">Set Most Important Task</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {result.data.mostImportantTask && (
            <p className="text-sm font-medium text-text-primary">
              {result.data.mostImportantTask.title}
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {result.data.topThree.map((task) => (
              <li key={task.id} className="text-sm text-text-secondary">
                {task.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}

export async function TodayCard() {
  const result = await safeModule(getTodayData);
  return <TodayCardBody result={result} />;
}
