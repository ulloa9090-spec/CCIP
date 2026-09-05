import Link from "next/link";
import { Flame, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardHabitData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getHabitData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function HabitSnapshotCardBody({ result }: { result: ModuleResult<DashboardHabitData> }) {
  return (
    <WidgetCard title="Habits" icon={<Repeat className="h-4 w-4" />} accent="orange">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          description="Build your first consistency habit."
          action={
            <Button size="sm" asChild>
              <Link href="/habits">New Habit</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {result.data.habits.map((habit) => (
            <li key={habit.id} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{habit.name}</span>
              <span className="flex items-center gap-1 text-text-secondary">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {habit.streak}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

export async function HabitSnapshotCard() {
  const result = await safeModule(getHabitData);
  return <HabitSnapshotCardBody result={result} />;
}
