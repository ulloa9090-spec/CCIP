import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { DashboardProgressData, ModuleResult } from "@/features/dashboard/types";
import { safeModule, getProgressData } from "@/features/dashboard/get-dashboard-data";
import { WidgetCard } from "./widget-card";
import { WidgetError } from "./widget-error";

export function ProgressCardBody({ result }: { result: ModuleResult<DashboardProgressData> }) {
  return (
    <WidgetCard title="Progress" icon={<BarChart3 className="h-4 w-4" />}>
      {result.status === "error" ? (
        <WidgetError />
      ) : result.data.goalProgress.length === 0 ? (
        <EmptyState
          title="Not enough data yet"
          description="Progress appears once you have goals or projects to track."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {result.data.goalProgress.map((g) => (
            <ProgressBar key={g.label} value={g.percent} label={g.label} />
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

export async function ProgressCard() {
  const result = await safeModule(getProgressData);
  return <ProgressCardBody result={result} />;
}
