// Phase 7 streak/consistency engine correctness test (blueprint §K.2).
// No unit-test framework is installed in this project (Playwright E2E only),
// and the engine is pure server-side TypeScript with no DB dependency, so
// this runs the real module directly via tsx rather than driving the UI —
// faster, and exercises the exact same code the app calls.
// Run: npx tsx tests/habit-streak.ts
import { addDays, startOfWeek } from "date-fns";
import { computeConsistency, computeStreak, isHabitDueOn, toDateStr } from "../features/habits/progress";
import type { Habit, HabitLog } from "../features/habits/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

function mkHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    goalId: null,
    goalTitle: null,
    projectId: null,
    projectName: null,
    name: "Test Habit",
    description: null,
    category: null,
    frequency: "daily",
    customDays: null,
    target: 1,
    preferredTime: null,
    startDate: "2026-06-01",
    isActive: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function mkLog(habitId: string, date: Date, completed = true): HabitLog {
  const dateStr = toDateStr(date);
  return { id: `${habitId}-${dateStr}`, habitId, logDate: dateStr, completed, note: null };
}

const today = new Date(2026, 8, 3); // 2026-09-03, a fixed reference date

// 1. Daily streak: 5 consecutive days ending today.
{
  const habit = mkHabit();
  const logs = [0, 1, 2, 3, 4].map((i) => mkLog(habit.id, addDays(today, -i)));
  const streak = computeStreak(habit, logs, today);
  assert(streak === 5, `daily streak of 5 consecutive days ending today = 5, got ${streak}`);
}

// 2. A gap breaks the streak — only the trailing run counts.
{
  const habit = mkHabit();
  const logs = [0, 1, 2, 5].map((i) => mkLog(habit.id, addDays(today, -i))); // gap at i=3,4
  const streak = computeStreak(habit, logs, today);
  assert(streak === 3, `daily streak with a gap counts only the trailing run (3), got ${streak}`);
}

// 3. Today not yet marked doesn't break yesterday's streak.
{
  const habit = mkHabit();
  const logs = [1, 2].map((i) => mkLog(habit.id, addDays(today, -i))); // today (i=0) unmarked
  const streak = computeStreak(habit, logs, today);
  assert(streak === 2, `unmarked today doesn't break the streak from prior days (2), got ${streak}`);
}

// 4. Weekdays habit: weekends aren't required, so they neither extend nor break the streak.
{
  const habit = mkHabit({ frequency: "weekdays" });
  const logs: HabitLog[] = [];
  let expected = 0;
  for (let i = 0; i < 14; i++) {
    const day = addDays(today, -i);
    if (isHabitDueOn(habit, day)) {
      logs.push(mkLog(habit.id, day));
      expected++;
    }
  }
  const streak = computeStreak(habit, logs, today);
  assert(
    streak === expected,
    `weekdays streak counts only required weekdays over 14 days (expected ${expected}), got ${streak}`,
  );
}

// 5. Weekly habit: the unit is weeks — one mark anywhere in the week counts as that week's mark.
{
  const habit = mkHabit({ frequency: "weekly" });
  const weekStartsOn = 1 as const;
  const logs: HabitLog[] = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = addDays(startOfWeek(today, { weekStartsOn }), -7 * w);
    logs.push(mkLog(habit.id, weekStart));
  }
  const streak = computeStreak(habit, logs, today, weekStartsOn);
  assert(streak === 4, `weekly streak counts 4 consecutive weeks with a mark each, got ${streak}`);
}

// 6. Weekly habit: the current week not marked yet doesn't break the streak (the week isn't over).
{
  const habit = mkHabit({ frequency: "weekly" });
  const weekStartsOn = 1 as const;
  const logs: HabitLog[] = [];
  for (const w of [1, 2, 3]) {
    const weekStart = addDays(startOfWeek(today, { weekStartsOn }), -7 * w);
    logs.push(mkLog(habit.id, weekStart));
  }
  const streak = computeStreak(habit, logs, today, weekStartsOn);
  assert(streak === 3, `weekly streak: current week unmarked doesn't break streak from prior 3 weeks, got ${streak}`);
}

// 7. Weekly habit: a past week with zero marks does break the streak.
{
  const habit = mkHabit({ frequency: "weekly" });
  const weekStartsOn = 1 as const;
  const logs: HabitLog[] = [];
  for (const w of [0, 1, 3]) {
    // week 2 skipped
    const weekStart = addDays(startOfWeek(today, { weekStartsOn }), -7 * w);
    logs.push(mkLog(habit.id, weekStart));
  }
  const streak = computeStreak(habit, logs, today, weekStartsOn);
  assert(streak === 2, `weekly streak breaks at a past week with no mark (2), got ${streak}`);
}

// 8. Paused habit: streak freezes at the pause date, ignoring any later activity.
{
  const pauseDate = addDays(today, -2);
  const habit = mkHabit({ isActive: false, updatedAt: `${toDateStr(pauseDate)}T00:00:00.000Z` });
  const logs = [
    mkLog(habit.id, addDays(pauseDate, -2)),
    mkLog(habit.id, addDays(pauseDate, -1)),
    mkLog(habit.id, pauseDate),
    mkLog(habit.id, today), // stray mark after pause — must not extend the frozen streak
  ];
  const streak = computeStreak(habit, logs, today);
  assert(streak === 3, `paused habit freezes streak at pause date, ignoring later activity (3), got ${streak}`);
}

// 9. Consistency %: 5 of the trailing 7 days completed.
{
  const habit = mkHabit();
  const logs = [0, 1, 2, 3, 4].map((i) => mkLog(habit.id, addDays(today, -i)));
  const pct = computeConsistency(habit, logs, today, 7);
  const expected = Math.round((5 / 7) * 100);
  assert(pct === expected, `7-day consistency = 5/7 completed (${expected}%), got ${pct}%`);
}

// 10. Consistency is null, not a misleading 0%, when the habit didn't exist yet for the window.
{
  const habit = mkHabit({ startDate: toDateStr(addDays(today, 1)) }); // starts tomorrow
  const pct = computeConsistency(habit, [], today, 7);
  assert(pct === null, `consistency is null for a habit that hasn't started yet, got ${pct}`);
}

console.log("\nAll habit streak/consistency tests passed.");
