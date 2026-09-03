import "server-only";
import { addDays, endOfMonth, startOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getHabits, getHabitLogs } from "@/features/habits/queries";
import { isHabitDueOn, toDateStr } from "@/features/habits/progress";
import type { Habit, HabitLog } from "@/features/habits/types";
import type { MonthlyAutoSummary } from "./types";

export interface WeeklyMetrics {
  weekStartDate: string;
  weeklyPriorityTotal: number;
  weeklyPriorityCompleted: number;
  importantTaskTotal: number;
  importantTaskCompleted: number;
  habitCount: number;
  habitConsistencyAvgPct: number | null;
  focusMinutes: number;
  overdueTaskCount: number;
  tasksCreated: number;
  tasksCompleted: number;
  hasPriorReview: boolean;
  previousWeekReviewCompleted: boolean;
}

function computeHabitWeeklyConsistency(habit: Habit, logs: HabitLog[], weekStart: Date): number | null {
  const habitStart = new Date(`${habit.startDate}T00:00:00`);
  const completed = new Set(logs.filter((l) => l.completed).map((l) => l.logDate));

  if (habit.frequency === "weekly") {
    if (weekStart < habitStart && addDays(weekStart, 6) < habitStart) return null;
    return completed.size > 0 ? 100 : 0;
  }

  let expected = 0;
  let done = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (d < habitStart) continue;
    if (isHabitDueOn(habit, d)) {
      expected++;
      if (completed.has(toDateStr(d))) done++;
    }
  }
  return expected === 0 ? null : (done / expected) * 100;
}

/** Blueprint §L: the one place every "week of activity" rollup is computed —
 * Weekly Review's auto_summary, Analytics' weekly metrics, and (Phase 10)
 * the AI Coach's Weekly Coach context all read from this same shape, so
 * they can never quietly diverge. */
export async function computeWeeklyMetrics(weekStartDate: Date): Promise<WeeklyMetrics> {
  const supabase = await createClient();
  const weekStartStr = toDateStr(weekStartDate);
  const weekEndDate = addDays(weekStartDate, 6);
  const weekEndStr = toDateStr(weekEndDate);
  const nextDayStr = toDateStr(addDays(weekEndDate, 1));
  const previousWeekStartStr = toDateStr(addDays(weekStartDate, -7));
  const todayStr = toDateStr(new Date());

  const [priorityRes, importantRes, focusRes, overdueRes, createdRes, completedRes, previousReviewRes, habits] =
    await Promise.all([
      supabase
        .from("weekly_priorities")
        .select("task_id, tasks ( status )")
        .eq("week_start_date", weekStartStr),
      supabase
        .from("tasks")
        .select("id, status")
        .is("deleted_at", null)
        .in("priority", ["critical", "high"])
        .gte("due_date", weekStartStr)
        .lte("due_date", weekEndStr),
      supabase
        .from("focus_sessions")
        .select("actual_minutes")
        .gte("started_at", `${weekStartStr}T00:00:00.000Z`)
        .lt("started_at", `${nextDayStr}T00:00:00.000Z`),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .neq("status", "done")
        .neq("status", "cancelled")
        .lt("due_date", todayStr),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .gte("created_at", `${weekStartStr}T00:00:00.000Z`)
        .lt("created_at", `${nextDayStr}T00:00:00.000Z`),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "done")
        .gte("completed_at", `${weekStartStr}T00:00:00.000Z`)
        .lt("completed_at", `${nextDayStr}T00:00:00.000Z`),
      supabase
        .from("weekly_reviews")
        .select("status")
        .eq("week_start_date", previousWeekStartStr)
        .maybeSingle(),
      getHabits({ activeOnly: false }),
    ]);

  const priorityRows = (priorityRes.data ?? []) as unknown as { task_id: string; tasks: { status: string } | null }[];
  const weeklyPriorityTotal = priorityRows.length;
  const weeklyPriorityCompleted = priorityRows.filter((r) => r.tasks?.status === "done").length;

  const importantRows = (importantRes.data ?? []) as { id: string; status: string }[];
  const importantTaskTotal = importantRows.length;
  const importantTaskCompleted = importantRows.filter((r) => r.status === "done").length;

  const focusMinutes = ((focusRes.data ?? []) as { actual_minutes: number }[]).reduce(
    (sum, r) => sum + r.actual_minutes,
    0,
  );

  const relevantHabits = habits.filter((h) => h.startDate <= weekEndStr);
  const habitLogs =
    relevantHabits.length > 0 ? await getHabitLogs(relevantHabits.map((h) => h.id), weekStartStr, weekEndStr) : [];
  const habitScores = relevantHabits
    .map((h) => computeHabitWeeklyConsistency(h, habitLogs.filter((l) => l.habitId === h.id), weekStartDate))
    .filter((v): v is number => v !== null);
  const habitConsistencyAvgPct =
    habitScores.length > 0 ? habitScores.reduce((sum, v) => sum + v, 0) / habitScores.length : null;

  return {
    weekStartDate: weekStartStr,
    weeklyPriorityTotal,
    weeklyPriorityCompleted,
    importantTaskTotal,
    importantTaskCompleted,
    habitCount: relevantHabits.length,
    habitConsistencyAvgPct,
    focusMinutes,
    overdueTaskCount: overdueRes.count ?? 0,
    tasksCreated: createdRes.count ?? 0,
    tasksCompleted: completedRes.count ?? 0,
    hasPriorReview: previousReviewRes.data !== null,
    previousWeekReviewCompleted: previousReviewRes.data?.status === "completed",
  };
}

/** Monthly Review's auto_summary (blueprint §I.9): lighter than the weekly
 * rollup — task/focus totals for the calendar month, average habit
 * consistency across the month's required days, and the average of that
 * month's already-locked weekly execution scores. */
export async function computeMonthlySummary(monthDate: Date): Promise<MonthlyAutoSummary> {
  const supabase = await createClient();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthStartStr = toDateStr(monthStart);
  const nextMonthStartStr = toDateStr(addDays(monthEnd, 1));

  const [completedRes, focusRes, weeklyReviewsRes, habits] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "done")
      .gte("completed_at", `${monthStartStr}T00:00:00.000Z`)
      .lt("completed_at", `${nextMonthStartStr}T00:00:00.000Z`),
    supabase
      .from("focus_sessions")
      .select("actual_minutes")
      .gte("started_at", `${monthStartStr}T00:00:00.000Z`)
      .lt("started_at", `${nextMonthStartStr}T00:00:00.000Z`),
    supabase
      .from("weekly_reviews")
      .select("execution_score")
      .eq("status", "completed")
      .gte("week_start_date", monthStartStr)
      .lt("week_start_date", nextMonthStartStr),
    getHabits({ activeOnly: false }),
  ]);

  const focusMinutes = ((focusRes.data ?? []) as { actual_minutes: number }[]).reduce(
    (sum, r) => sum + r.actual_minutes,
    0,
  );

  const scores = ((weeklyReviewsRes.data ?? []) as { execution_score: number | null }[])
    .map((r) => r.execution_score)
    .filter((v): v is number => v !== null);
  const avgExecutionScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;

  const relevantHabits = habits.filter((h) => h.startDate <= toDateStr(monthEnd));
  const habitLogs =
    relevantHabits.length > 0
      ? await getHabitLogs(relevantHabits.map((h) => h.id), monthStartStr, toDateStr(monthEnd))
      : [];
  const habitScores = relevantHabits
    .map((h) => {
      const habitStart = new Date(`${h.startDate}T00:00:00`);
      const completed = new Set(
        habitLogs.filter((l) => l.habitId === h.id && l.completed).map((l) => l.logDate),
      );
      let expected = 0;
      let done = 0;
      for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
        if (d < habitStart) continue;
        if (h.frequency === "weekly") continue; // weekly habits are day-agnostic; skip in a day-by-day walk
        if (isHabitDueOn(h, d)) {
          expected++;
          if (completed.has(toDateStr(d))) done++;
        }
      }
      return expected === 0 ? null : (done / expected) * 100;
    })
    .filter((v): v is number => v !== null);
  const habitConsistencyAvgPct =
    habitScores.length > 0 ? habitScores.reduce((sum, v) => sum + v, 0) / habitScores.length : null;

  return {
    tasksCompleted: completedRes.count ?? 0,
    focusMinutes,
    habitConsistencyAvgPct,
    avgExecutionScore,
    weeksReviewed: scores.length,
  };
}
