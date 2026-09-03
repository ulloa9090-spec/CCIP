// Phase 9 Weekly Execution Score correctness test (blueprint §L).
// Same rationale as tests/habit-streak.ts: no unit-test framework is
// otherwise installed, and computeExecutionScore() is pure logic with no
// DB dependency, so this runs the real module directly via tsx.
// Run: npx tsx tests/execution-score.ts
import { computeExecutionScore, DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES } from "../features/reviews/execution-score";
import type { WeeklyMetrics } from "../features/reviews/aggregate";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

function mkMetrics(overrides: Partial<WeeklyMetrics> = {}): WeeklyMetrics {
  return {
    weekStartDate: "2026-08-31",
    weeklyPriorityTotal: 3,
    weeklyPriorityCompleted: 2,
    importantTaskTotal: 4,
    importantTaskCompleted: 3,
    habitCount: 2,
    habitConsistencyAvgPct: 75,
    focusMinutes: 150,
    overdueTaskCount: 0,
    tasksCreated: 5,
    tasksCompleted: 4,
    hasPriorReview: true,
    previousWeekReviewCompleted: true,
    ...overrides,
  };
}

// 1. Full data: every component applicable — score is the plain weighted average.
{
  const metrics = mkMetrics();
  const { score, components } = computeExecutionScore(metrics);
  const expected = Math.round((30 * (2 / 3) + 25 * (3 / 4) + 20 * 0.75 + 15 * (150 / 300) + 10 * 1) / 100 * 100);
  assert(score === expected, `full-data score matches hand-computed weighted average (${expected}), got ${score}`);
  assert(
    components.every((c) => c.value !== null),
    "every component is applicable when all data is present",
  );
}

// 2. No weekly priorities set — WeeklyTop3Completion is 0%, NOT excluded (blueprint §L.2).
{
  const metrics = mkMetrics({ weeklyPriorityTotal: 0, weeklyPriorityCompleted: 0 });
  const { components } = computeExecutionScore(metrics);
  const top3 = components.find((c) => c.key === "weeklyTop3Completion")!;
  assert(top3.value === 0, `WeeklyTop3Completion is 0 (counted), not excluded, when no priorities were set`);
}

// 3. No P1/P2 tasks due — ImportantTaskCompletion excluded, weight redistributed.
{
  const metrics = mkMetrics({ importantTaskTotal: 0, importantTaskCompleted: 0 });
  const { score, components } = computeExecutionScore(metrics);
  const important = components.find((c) => c.key === "importantTaskCompletion")!;
  assert(important.value === null, "ImportantTaskCompletion is excluded when no P1/P2 tasks are due");

  const applicable = components.filter((c) => c.value !== null);
  const totalWeight = applicable.reduce((s, c) => s + c.weight, 0);
  const weightedSum = applicable.reduce((s, c) => s + c.weight * (c.value as number), 0);
  const expected = Math.round((weightedSum / totalWeight) * 100);
  assert(score === expected, `score correctly rescales remaining weights to 100% (${expected}), got ${score}`);
}

// 4. No habits configured — HabitConsistency excluded, weight redistributed.
{
  const metrics = mkMetrics({ habitCount: 0, habitConsistencyAvgPct: null });
  const { components } = computeExecutionScore(metrics);
  const habit = components.find((c) => c.key === "habitConsistency")!;
  assert(habit.value === null, "HabitConsistency is excluded when no habits are configured");
}

// 5. No prior review (first week of account) — WeeklyReviewCompleted excluded.
{
  const metrics = mkMetrics({ hasPriorReview: false, previousWeekReviewCompleted: false });
  const { components } = computeExecutionScore(metrics);
  const review = components.find((c) => c.key === "weeklyReviewCompleted")!;
  assert(review.value === null, "WeeklyReviewCompleted is excluded when there's no prior review to check");
}

// 6. Zero focus minutes — FocusTimeRatio is 0%, NOT excluded (a fixed target always has a denominator).
{
  const metrics = mkMetrics({ focusMinutes: 0 });
  const { components } = computeExecutionScore(metrics);
  const focus = components.find((c) => c.key === "focusTimeRatio")!;
  assert(focus.value === 0, "FocusTimeRatio is 0 (counted), not excluded, when no focus time was logged");
}

// 7. Focus minutes at or beyond the weekly target — ratio capped at 100%, never over.
{
  const metrics = mkMetrics({ focusMinutes: DEFAULT_WEEKLY_FOCUS_TARGET_MINUTES * 3 });
  const { components } = computeExecutionScore(metrics);
  const focus = components.find((c) => c.key === "focusTimeRatio")!;
  assert(focus.value === 1, `FocusTimeRatio caps at 100% (1.0) when minutes exceed the target, got ${focus.value}`);
}

// 8. "Not enough data": zero priorities, zero important tasks due, zero habits,
//    zero focus minutes, and no prior review — score is null, not a misleading 0.
{
  const metrics = mkMetrics({
    weeklyPriorityTotal: 0,
    weeklyPriorityCompleted: 0,
    importantTaskTotal: 0,
    importantTaskCompleted: 0,
    habitCount: 0,
    habitConsistencyAvgPct: null,
    focusMinutes: 0,
    hasPriorReview: false,
    previousWeekReviewCompleted: false,
  });
  const { score } = computeExecutionScore(metrics);
  assert(score === null, "a week with zero signal on every component returns null, not a misleading 0");
}

// 9. All five components excluded except one still-applicable component (weekly
//    priorities set, but nothing else) — score equals that one component's value.
{
  const metrics = mkMetrics({
    weeklyPriorityTotal: 4,
    weeklyPriorityCompleted: 1,
    importantTaskTotal: 0,
    importantTaskCompleted: 0,
    habitCount: 0,
    habitConsistencyAvgPct: null,
    focusMinutes: 0,
    hasPriorReview: false,
    previousWeekReviewCompleted: false,
  });
  const { score } = computeExecutionScore(metrics);
  // weeklyTop3Completion = 1/4 = 25% is counted; focusTimeRatio = 0% is also
  // always counted — so the applicable set is {top3: 25%, focus: 0%},
  // weights 30+15=45 rescaled to 100%.
  const expected = Math.round(((30 * 0.25 + 15 * 0) / 45) * 100);
  assert(score === expected, `partial-activity week rescales correctly (${expected}), got ${score}`);
}

console.log("\nAll execution score tests passed.");
