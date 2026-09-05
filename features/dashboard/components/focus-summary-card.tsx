import Link from "next/link";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardFocusData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getFocusData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function FocusSummaryCardBody({ result }: { result: ModuleResult<DashboardFocusData> }) {
  return (
    <WidgetCard title="Focus" icon={<Timer className="h-4 w-4" />} accent="teal">
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.sessionsToday === 0 ? (
        <EmptyState
          title="No sessions logged"
          description="Run a focus session to log deep work time."
          action={
            <Button size="sm" asChild>
              <Link href="/focus">Start Focus Session</Link>
            </Button>
          }
        />
      ) : (
        <p className="text-sm text-text-primary">
          {result.data.sessionsToday} session{result.data.sessionsToday === 1 ? "" : "s"} ·{" "}
          {result.data.minutesToday} min today
        </p>
      )}
    </WidgetCard>
  );
}

export async function FocusSummaryCard() {
  const result = await safeModule(getFocusData);
  return <FocusSummaryCardBody result={result} />;
}
