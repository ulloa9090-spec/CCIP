/**
 * blueprint §M.4 — the pure half of the Automation engine: given
 * already-fetched data, decide whether a trigger is due and, for
 * task_overdue, which tasks match. `evaluate.ts` does the Supabase reads
 * and calls these; no I/O here, so this is directly `tsx`-testable.
 */
import type { TaskOverdueCondition, TaskOverdueTriggerConfig, WeeklyScheduleTriggerConfig } from "./types";

/** Whole-day difference between `dueDate` and `today` (both "yyyy-mm-dd"),
 * treated as UTC calendar days. */
export function daysBetween(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  return Math.floor((now - due) / 86_400_000);
}

/** task_overdue is checked at most once per calendar day (UTC) — `today`
 * being a different date than the last recorded run is what makes it due
 * again, regardless of how many times the page loaded that same day. */
export function isTaskOverdueCheckDue(lastRunAt: string | null, today: string): boolean {
  return !lastRunAt || lastRunAt.slice(0, 10) !== today;
}

export function matchingOverdueTasks<T extends { dueDate: string; priority: string }>(
  tasks: T[],
  triggerConfig: TaskOverdueTriggerConfig,
  condition: TaskOverdueCondition | null,
  today: string,
): T[] {
  const priorities = condition?.priorities;
  return tasks.filter((t) => {
    if (daysBetween(t.dueDate, today) < triggerConfig.minDays) return false;
    if (priorities && priorities.length > 0 && !priorities.includes(t.priority)) return false;
    return true;
  });
}

/** The most recent date/time at or before `now` matching `dayOfWeek`
 * (0=Sunday) and `hour` — i.e. "when did this week's scheduled slot last
 * occur." If today is the scheduled day but the scheduled hour hasn't
 * happened yet, that's last week's occurrence, not today's. */
export function computeMostRecentScheduledFireTime(dayOfWeek: number, hour: number, now: Date): Date {
  const result = new Date(now);
  result.setUTCHours(hour, 0, 0, 0);
  let daysSince = (now.getUTCDay() - dayOfWeek + 7) % 7;
  if (daysSince === 0 && result.getTime() > now.getTime()) daysSince = 7;
  result.setUTCDate(result.getUTCDate() - daysSince);
  return result;
}

export function isWeeklyScheduleDue(triggerConfig: WeeklyScheduleTriggerConfig, lastRunAt: string | null, now: Date): boolean {
  const scheduled = computeMostRecentScheduledFireTime(triggerConfig.dayOfWeek, triggerConfig.hour, now);
  if (!lastRunAt) return true;
  return new Date(lastRunAt).getTime() < scheduled.getTime();
}
