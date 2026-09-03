import "server-only";
import { addDays, startOfWeek } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getHabits, getHabitLogs } from "@/features/habits/queries";
import { computeConsistency, toDateStr } from "@/features/habits/progress";
import type { AnalyticsData, AnalyticsMetric, AnalyticsRangeDays, SeriesPoint } from "./types";

function dayRange(rangeDays: number, today: Date): Date[] {
  const start = addDays(today, -(rangeDays - 1));
  return Array.from({ length: rangeDays }, (_, i) => addDays(start, i));
}

function weekRange(rangeDays: number, today: Date, weekStartsOn: 0 | 1): Date[] {
  const start = addDays(today, -(rangeDays - 1));
  const weeks: Date[] = [];
  let w = startOfWeek(start, { weekStartsOn });
  const lastWeek = startOfWeek(today, { weekStartsOn });
  while (w <= lastWeek) {
    weeks.push(w);
    w = addDays(w, 7);
  }
  return weeks;
}

function latestValue(points: SeriesPoint[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.value !== null) return points[i]!.value;
  }
  return null;
}

async function buildTaskCompletionRate(days: Date[]): Promise<AnalyticsMetric> {
  const supabase = await createClient();
  const start = toDateStr(days[0]!);
  const end = toDateStr(days[days.length - 1]!);

  const { data } = await supabase
    .from("tasks")
    .select("due_date, status")
    .is("deleted_at", null)
    .gte("due_date", start)
    .lte("due_date", end);

  const rows = (data ?? []) as { due_date: string; status: string }[];
  const points: SeriesPoint[] = days.map((d) => {
    const dateStr = toDateStr(d);
    const dueThatDay = rows.filter((r) => r.due_date === dateStr);
    if (dueThatDay.length === 0) return { date: dateStr, value: null };
    const done = dueThatDay.filter((r) => r.status === "done").length;
    return { date: dateStr, value: Math.round((done / dueThatDay.length) * 100) };
  });

  return {
    key: "taskCompletionRate",
    label: "Task Completion Rate",
    unit: "percent",
    granularity: "day",
    series: [{ label: "Completion Rate", points }],
    current: latestValue(points),
  };
}

async function buildWeeklyPriorityCompletion(weeks: Date[]): Promise<AnalyticsMetric> {
  const supabase = await createClient();
  const start = toDateStr(weeks[0]!);

  const { data } = await supabase
    .from("weekly_priorities")
    .select("week_start_date, tasks ( status )")
    .gte("week_start_date", start);

  const rows = (data ?? []) as unknown as { week_start_date: string; tasks: { status: string } | null }[];
  const points: SeriesPoint[] = weeks.map((w) => {
    const dateStr = toDateStr(w);
    const weekRows = rows.filter((r) => r.week_start_date === dateStr);
    if (weekRows.length === 0) return { date: dateStr, value: null };
    const done = weekRows.filter((r) => r.tasks?.status === "done").length;
    return { date: dateStr, value: Math.round((done / weekRows.length) * 100) };
  });

  return {
    key: "weeklyPriorityCompletion",
    label: "Weekly Priority Completion",
    unit: "percent",
    granularity: "week",
    series: [{ label: "Priority Completion", points }],
    current: latestValue(points),
  };
}

async function buildHabitConsistency(days: Date[], weekStartsOn: 0 | 1): Promise<AnalyticsMetric> {
  const habits = await getHabits({ activeOnly: false });
  const lookbackStart = toDateStr(addDays(days[0]!, -6));
  const end = toDateStr(days[days.length - 1]!);
  const logs = habits.length > 0 ? await getHabitLogs(habits.map((h) => h.id), lookbackStart, end) : [];

  const points: SeriesPoint[] = days.map((d) => {
    const relevant = habits.filter((h) => h.startDate <= toDateStr(d));
    if (relevant.length === 0) return { date: toDateStr(d), value: null };
    const scores = relevant
      .map((h) => computeConsistency(h, logs.filter((l) => l.habitId === h.id), d, 7, weekStartsOn))
      .filter((v): v is number => v !== null);
    if (scores.length === 0) return { date: toDateStr(d), value: null };
    return { date: toDateStr(d), value: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) };
  });

  return {
    key: "habitConsistency",
    label: "Habit Consistency",
    unit: "percent",
    granularity: "day",
    series: [{ label: "Consistency", points }],
    current: latestValue(points),
  };
}

async function buildFocusMinutes(days: Date[]): Promise<AnalyticsMetric> {
  const supabase = await createClient();
  const start = toDateStr(days[0]!);
  const nextDay = toDateStr(addDays(days[days.length - 1]!, 1));

  const { data } = await supabase
    .from("focus_sessions")
    .select("started_at, actual_minutes")
    .gte("started_at", `${start}T00:00:00.000Z`)
    .lt("started_at", `${nextDay}T00:00:00.000Z`);

  const rows = (data ?? []) as { started_at: string; actual_minutes: number }[];
  const points: SeriesPoint[] = days.map((d) => {
    const dateStr = toDateStr(d);
    const minutes = rows
      .filter((r) => r.started_at.slice(0, 10) === dateStr)
      .reduce((sum, r) => sum + r.actual_minutes, 0);
    return { date: dateStr, value: minutes };
  });

  return {
    key: "focusMinutes",
    label: "Focus Minutes",
    unit: "minutes",
    granularity: "day",
    series: [{ label: "Focus Minutes", points }],
    current: latestValue(points),
  };
}

async function buildOverdueTasks(days: Date[]): Promise<AnalyticsMetric> {
  const supabase = await createClient();
  const end = toDateStr(days[days.length - 1]!);

  const { data } = await supabase
    .from("tasks")
    .select("due_date, completed_at")
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .not("due_date", "is", null)
    .lte("due_date", end);

  const rows = (data ?? []) as { due_date: string; completed_at: string | null }[];
  const points: SeriesPoint[] = days.map((d) => {
    const dateStr = toDateStr(d);
    const count = rows.filter((r) => {
      if (r.due_date >= dateStr) return false;
      if (!r.completed_at) return true;
      return r.completed_at.slice(0, 10) > dateStr;
    }).length;
    return { date: dateStr, value: count };
  });

  return {
    key: "overdueTasks",
    label: "Overdue Tasks",
    unit: "count",
    granularity: "day",
    series: [{ label: "Overdue", points }],
    current: latestValue(points),
  };
}

async function buildCreatedVsCompleted(days: Date[]): Promise<AnalyticsMetric> {
  const supabase = await createClient();
  const start = toDateStr(days[0]!);
  const nextDay = toDateStr(addDays(days[days.length - 1]!, 1));

  const [createdRes, completedRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("created_at")
      .is("deleted_at", null)
      .gte("created_at", `${start}T00:00:00.000Z`)
      .lt("created_at", `${nextDay}T00:00:00.000Z`),
    supabase
      .from("tasks")
      .select("completed_at")
      .is("deleted_at", null)
      .eq("status", "done")
      .gte("completed_at", `${start}T00:00:00.000Z`)
      .lt("completed_at", `${nextDay}T00:00:00.000Z`),
  ]);

  const created = (createdRes.data ?? []) as { created_at: string }[];
  const completed = (completedRes.data ?? []) as { completed_at: string }[];

  const createdPoints: SeriesPoint[] = days.map((d) => {
    const dateStr = toDateStr(d);
    return { date: dateStr, value: created.filter((r) => r.created_at.slice(0, 10) === dateStr).length };
  });
  const completedPoints: SeriesPoint[] = days.map((d) => {
    const dateStr = toDateStr(d);
    return { date: dateStr, value: completed.filter((r) => r.completed_at.slice(0, 10) === dateStr).length };
  });

  return {
    key: "createdVsCompleted",
    label: "Created vs Completed",
    unit: "count",
    granularity: "day",
    series: [
      { label: "Created", points: createdPoints },
      { label: "Completed", points: completedPoints },
    ],
    current: latestValue(completedPoints),
  };
}

async function buildWeeklyScoreTrend(weeks: Date[]): Promise<AnalyticsMetric> {
  const supabase = await createClient();
  const start = toDateStr(weeks[0]!);

  const { data } = await supabase
    .from("weekly_reviews")
    .select("week_start_date, execution_score")
    .eq("status", "completed")
    .gte("week_start_date", start);

  const rows = (data ?? []) as { week_start_date: string; execution_score: number | null }[];
  const points: SeriesPoint[] = weeks.map((w) => {
    const dateStr = toDateStr(w);
    const row = rows.find((r) => r.week_start_date === dateStr);
    return { date: dateStr, value: row?.execution_score ?? null };
  });

  return {
    key: "weeklyScoreTrend",
    label: "Weekly Score Trend",
    unit: "score",
    granularity: "week",
    series: [{ label: "Execution Score", points }],
    current: latestValue(points),
  };
}

export async function getAnalyticsData(rangeDays: AnalyticsRangeDays, weekStartsOn: 0 | 1 = 1): Promise<AnalyticsData> {
  const today = new Date();
  const days = dayRange(rangeDays, today);
  const weeks = weekRange(rangeDays, today, weekStartsOn);

  const metrics = await Promise.all([
    buildTaskCompletionRate(days),
    buildWeeklyPriorityCompletion(weeks),
    buildHabitConsistency(days, weekStartsOn),
    buildFocusMinutes(days),
    buildOverdueTasks(days),
    buildCreatedVsCompleted(days),
    buildWeeklyScoreTrend(weeks),
  ]);

  return { rangeDays, metrics };
}
