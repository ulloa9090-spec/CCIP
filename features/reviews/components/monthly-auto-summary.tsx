import type { MonthlyAutoSummary as MonthlyAutoSummaryData } from "@/features/reviews/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-sm font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export function MonthlyAutoSummary({ summary }: { summary: MonthlyAutoSummaryData }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Stat label="Tasks Completed" value={String(summary.tasksCompleted)} />
      <Stat label="Focus Minutes" value={String(summary.focusMinutes)} />
      <Stat
        label="Habit Consistency"
        value={summary.habitConsistencyAvgPct !== null ? `${Math.round(summary.habitConsistencyAvgPct)}%` : "—"}
      />
      <Stat
        label="Avg Weekly Score"
        value={summary.avgExecutionScore !== null ? `${summary.avgExecutionScore}%` : "—"}
      />
      <Stat label="Weeks Reviewed" value={String(summary.weeksReviewed)} />
    </div>
  );
}
