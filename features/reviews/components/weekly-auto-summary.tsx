import type { WeeklyMetrics } from "@/features/reviews/aggregate";
import { DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES } from "@/features/reviews/execution-score";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export function WeeklyAutoSummary({ metrics }: { metrics: WeeklyMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Stat
        label="Weekly Priorities"
        value={`${metrics.weeklyPriorityCompleted} / ${metrics.weeklyPriorityTotal}`}
      />
      <Stat
        label="Important Tasks (P1/P2)"
        value={metrics.importantTaskTotal > 0 ? `${metrics.importantTaskCompleted} / ${metrics.importantTaskTotal}` : "—"}
      />
      <Stat
        label="Habit Consistency"
        value={metrics.habitConsistencyAvgPct !== null ? `${Math.round(metrics.habitConsistencyAvgPct)}%` : "—"}
      />
      <Stat label="Focus Minutes" value={`${metrics.focusMinutes} / ${DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES}`} />
      <Stat label="Overdue Tasks" value={String(metrics.overdueTaskCount)} />
      <Stat label="Tasks Created / Completed" value={`${metrics.tasksCreated} / ${metrics.tasksCompleted}`} />
    </div>
  );
}
