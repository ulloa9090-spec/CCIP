import Link from "next/link";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardCalendarData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getCalendarData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function CalendarSnapshotCardBody({
  result,
}: {
  result: ModuleResult<DashboardCalendarData>;
}) {
  return (
    <WidgetCard title="Calendar" icon={<CalendarIcon className="h-4 w-4" />}>
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          title="Nothing this week"
          description="Schedule a task or add a time block."
          action={
            <Button size="sm" asChild>
              <Link href="/calendar">Open Calendar</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-1">
          {result.data.items.map((item) => (
            <li key={item.id} className="text-sm text-text-secondary">
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export async function CalendarSnapshotCard() {
  const result = await safeModule(getCalendarData);
  return <CalendarSnapshotCardBody result={result} />;
}
