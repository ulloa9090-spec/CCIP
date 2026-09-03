import type { Goal, QuarterCycle } from "./types";

/**
 * Goal progress (blueprint §K): metric-based when a metric exists —
 * (current - starting) / (target - starting), clamped 0-100. No metric
 * means no projects exist yet either (Phase 5), so there is nothing to
 * average — returns null ("not tracked yet"), not 0.
 */
export function computeGoalProgress(goal: Pick<Goal, "metric">): number | null {
  const metric = goal.metric;
  if (!metric || metric.startingValue === null || metric.targetValue === null || metric.currentValue === null) {
    return null;
  }
  const { startingValue, targetValue, currentValue } = metric;
  if (targetValue === startingValue) return null;

  const raw = ((currentValue - startingValue) / (targetValue - startingValue)) * 100;
  return Math.max(0, Math.min(100, raw));
}

/**
 * 90-Day Cycle progress (blueprint §K): equally-weighted average of its
 * linked goals' progress. Goals with no computable progress are excluded
 * from the average, not counted as 0 (redistribution rule, §L.2). Null
 * when no linked goal has a computable progress.
 */
export function computeCycleProgress(
  _cycle: Pick<QuarterCycle, "id">,
  linkedGoals: Pick<Goal, "metric">[],
): number | null {
  const values = linkedGoals
    .map((g) => computeGoalProgress(g))
    .filter((v): v is number => v !== null);

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
