import type { WeeklyMetrics } from "./aggregate";

/**
 * Blueprint §L.1's "configurable weekly target" for FocusTimeRatio — fixed
 * for now since Settings has no control for it yet (still a Phase 1
 * placeholder). See ADR 0011.
 */
export const DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES = 300;

export interface ExecutionScoreComponent {
  key: "weeklyTop3Completion" | "importantTaskCompletion" | "habitConsistency" | "focusTimeRatio" | "weeklyReviewCompleted";
  weight: number;
  /** 0-1, or null when this component's denominator is undefined (excluded, not counted as 0). */
  value: number | null;
}

export interface ExecutionScoreResult {
  /** 0-100, or null when there's not enough data to compute a score at all. */
  score: number | null;
  components: ExecutionScoreComponent[];
}

/**
 * Blueprint §L: weighted blend of five components, each 0-1, combined into
 * a 0-100 score. A component with an undefined denominator (no P1/P2 tasks
 * due, no habits configured, no prior review to check) is dropped and the
 * remaining weights rescaled to sum to 100% (§L.2) — never treated as 0%
 * or 100%, both of which would misrepresent a genuinely inactive week.
 * WeeklyTop3Completion and FocusTimeRatio always have a defined denominator
 * (an empty week's priorities is itself a signal; the focus target is
 * fixed) so they're never excluded, only ever 0-1.
 */
export function computeExecutionScore(metrics: WeeklyMetrics): ExecutionScoreResult {
  const weeklyTop3Completion =
    metrics.weeklyPriorityTotal > 0 ? metrics.weeklyPriorityCompleted / metrics.weeklyPriorityTotal : 0;

  const importantTaskCompletion =
    metrics.importantTaskTotal > 0 ? metrics.importantTaskCompleted / metrics.importantTaskTotal : null;

  const habitConsistency = metrics.habitCount > 0 ? (metrics.habitConsistencyAvgPct ?? 0) / 100 : null;

  const focusTimeRatio = Math.min(metrics.focusMinutes / DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES, 1);

  const weeklyReviewCompleted = metrics.hasPriorReview ? (metrics.previousWeekReviewCompleted ? 1 : 0) : null;

  const components: ExecutionScoreComponent[] = [
    { key: "weeklyTop3Completion", weight: 30, value: weeklyTop3Completion },
    { key: "importantTaskCompletion", weight: 25, value: importantTaskCompletion },
    { key: "habitConsistency", weight: 20, value: habitConsistency },
    { key: "focusTimeRatio", weight: 15, value: focusTimeRatio },
    { key: "weeklyReviewCompleted", weight: 10, value: weeklyReviewCompleted },
  ];

  // "Not enough data" (§L.3): a week with no priorities, no important tasks
  // due, no habits, no focus time, and no prior review to compare against
  // shows as unscored, not a misleading 0.
  const noActivity =
    metrics.weeklyPriorityTotal === 0 &&
    metrics.importantTaskTotal === 0 &&
    metrics.habitCount === 0 &&
    metrics.focusMinutes === 0 &&
    !metrics.hasPriorReview;
  if (noActivity) return { score: null, components };

  const applicable = components.filter((c) => c.value !== null);
  const totalWeight = applicable.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return { score: null, components };

  const weightedSum = applicable.reduce((sum, c) => sum + c.weight * (c.value as number), 0);
  const score = Math.round((weightedSum / totalWeight) * 100);

  return { score, components };
}
