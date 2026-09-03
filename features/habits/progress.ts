import { addDays, isBefore, startOfWeek } from "date-fns";
import type { Habit, HabitLog } from "./types";

/** How far back to fetch habit_logs for streak/consistency computation.
 * A streak walk stops at a real gap anyway, so this only under-counts a
 * habit with an unbroken streak longer than ~13 months — an accepted,
 * documented bound rather than fetching every log ever written. */
export const STREAK_LOOKBACK_DAYS = 400;

/**
 * "Today" as a calendar day in the given IANA timezone, represented as a
 * timezone-naive local Date at midnight — every function below operates in
 * this "habit-day space" so day-rollover never depends on the caller's own
 * clock (blueprint §K.2: "never the client's local clock"). This runs
 * server-side only (queries.ts / progress.ts are never imported by a Client
 * Component), so "the client's local clock" is never in play regardless.
 */
export function todayInTimezone(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return new Date(get("year"), get("month") - 1, get("day"));
}

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Whether `date` is a day this habit expects a mark on — "weekly" habits
 * don't have a per-day concept, so this always returns true for them (the
 * week as a whole is the unit; see computeWeeklyStreak). */
export function isHabitDueOn(habit: Habit, date: Date): boolean {
  return isRequiredDay(habit, date);
}

function isRequiredDay(habit: Habit, date: Date): boolean {
  const dow = date.getDay();
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "weekdays") return dow >= 1 && dow <= 5;
  if (habit.frequency === "custom") return (habit.customDays ?? []).includes(dow);
  return true; // "weekly" — required-day concept doesn't apply; handled per-week instead.
}

/** completed-log dates as a Set of "yyyy-mm-dd" strings, for O(1) lookups. */
function completedDateSet(logs: HabitLog[]): Set<string> {
  return new Set(logs.filter((l) => l.completed).map((l) => l.logDate));
}

/**
 * Daily/weekdays/custom streak (blueprint §K.2): consecutive required days
 * ending yesterday-or-today with a completion, walking backward until a
 * gap. Today not yet being marked never breaks the streak by itself — the
 * day hasn't rolled over — it's simply not counted until it is marked.
 */
function computeDailyStreak(habit: Habit, logs: HabitLog[], today: Date): number {
  const completed = completedDateSet(logs);
  const habitStart = new Date(`${habit.startDate}T00:00:00`);
  let streak = 0;
  let cursor = today;

  while (!isBefore(cursor, habitStart)) {
    if (isRequiredDay(habit, cursor)) {
      const isToday = toDateStr(cursor) === toDateStr(today);
      const done = completed.has(toDateStr(cursor));
      if (done) {
        streak++;
      } else if (!isToday) {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }

  return streak;
}

/**
 * Weekly streak (blueprint §K.2): the unit is weeks, not days — one
 * completion anywhere in the ISO week (per `weekStartsOn`) counts as that
 * week's mark. The current week not having a mark yet doesn't break the
 * streak (the week isn't over); a past week with zero marks does.
 */
function computeWeeklyStreak(habit: Habit, logs: HabitLog[], today: Date, weekStartsOn: 0 | 1): number {
  const completed = completedDateSet(logs);
  const habitStart = new Date(`${habit.startDate}T00:00:00`);
  let streak = 0;
  let weekStart = startOfWeek(today, { weekStartsOn });
  let isCurrentWeek = true;

  while (!isBefore(weekStart, startOfWeek(habitStart, { weekStartsOn }))) {
    let hasMark = false;
    for (let d = weekStart; isBefore(d, addDays(weekStart, 7)); d = addDays(d, 1)) {
      if (completed.has(toDateStr(d))) {
        hasMark = true;
        break;
      }
    }
    if (hasMark) {
      streak++;
    } else if (!isCurrentWeek) {
      break;
    }
    isCurrentWeek = false;
    weekStart = addDays(weekStart, -7);
  }

  return streak;
}

/**
 * Streak count, frozen at its last value while the habit is paused
 * (`is_active = false`) rather than reset — `updatedAt` is used as a proxy
 * for "when it was paused" since the schema doesn't track a separate
 * `paused_at` (blueprint §K.2: "setting is_active=false freezes the streak
 * ... rather than resetting it").
 */
export function computeStreak(habit: Habit, logs: HabitLog[], today: Date, weekStartsOn: 0 | 1 = 1): number {
  const anchor = habit.isActive ? today : new Date(habit.updatedAt.slice(0, 10));
  return habit.frequency === "weekly"
    ? computeWeeklyStreak(habit, logs, anchor, weekStartsOn)
    : computeDailyStreak(habit, logs, anchor);
}

/**
 * Consistency % (blueprint §K): completed periods / expected periods over
 * a trailing window — `null` when the habit didn't exist for any of it yet
 * (never a misleading 0%).
 */
export function computeConsistency(
  habit: Habit,
  logs: HabitLog[],
  today: Date,
  windowDays: number,
  weekStartsOn: 0 | 1 = 1,
): number | null {
  const completed = completedDateSet(logs);
  const habitStart = new Date(`${habit.startDate}T00:00:00`);
  const windowStart = addDays(today, -(windowDays - 1));
  const start = isBefore(windowStart, habitStart) ? habitStart : windowStart;
  if (isBefore(today, start)) return null;

  if (habit.frequency === "weekly") {
    let expected = 0;
    let done = 0;
    for (let weekStart = startOfWeek(start, { weekStartsOn }); !isBefore(today, weekStart); weekStart = addDays(weekStart, 7)) {
      expected++;
      for (let d = weekStart; isBefore(d, addDays(weekStart, 7)) && !isBefore(today, d); d = addDays(d, 1)) {
        if (completed.has(toDateStr(d))) {
          done++;
          break;
        }
      }
    }
    return expected === 0 ? null : Math.round((done / expected) * 100);
  }

  let expected = 0;
  let done = 0;
  for (let d = start; !isBefore(today, d); d = addDays(d, 1)) {
    if (isRequiredDay(habit, d)) {
      expected++;
      if (completed.has(toDateStr(d))) done++;
    }
  }
  return expected === 0 ? null : Math.round((done / expected) * 100);
}
