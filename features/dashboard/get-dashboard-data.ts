import "server-only";
import { addDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getGoals } from "@/features/goals/queries";
import { computeCycleProgress, computeGoalProgress } from "@/features/goals/progress";
import { getCurrentCycle } from "@/features/plan-90-days/queries";
import { getActiveProject } from "@/features/projects/queries";
import { computeProjectProgress } from "@/features/projects/progress";
import { getTodayTasks, getWeeklyPriorities, weekStartDate } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import { getCalendarItems } from "@/features/calendar/queries";
import { getHabitLogs, getHabitTimeSettings, getHabits } from "@/features/habits/queries";
import { computeStreak, STREAK_LOOKBACK_DAYS, todayInTimezone, toDateStr } from "@/features/habits/progress";
import { getTodaySessions } from "@/features/focus/queries";
import { getIdeas } from "@/features/ideas/queries";
import { getWeeklyReviews } from "@/features/reviews/queries";
import type {
  DashboardActiveProjectData,
  DashboardCalendarData,
  DashboardData,
  DashboardFocusData,
  DashboardHabitData,
  DashboardIdeaData,
  DashboardNinetyDayGoalData,
  DashboardProgressData,
  DashboardTodayData,
  DashboardUser,
  DashboardWeeklyPrioritiesData,
  DashboardWeeklyReviewData,
  DashboardWeeklyScoreData,
  ModuleResult,
  TaskSummary,
} from "./types";

function toTaskSummary(task: Task): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    dueDate: task.dueDate,
    projectName: task.projectName,
  };
}

/**
 * Wraps a module fetch so one domain's failure can never crash the whole
 * Dashboard (Phase 3 §8) — every module resolves to `ready` or `error`,
 * never throws past this boundary. Exported so each widget's own Server
 * Component can wrap its own independent fetch the same way (see
 * features/dashboard/components/*) — getDashboardData() below uses it too,
 * for callers that want the whole bundle in one shot.
 */
export async function safeModule<T>(fn: () => Promise<T>): Promise<ModuleResult<T>> {
  try {
    return { status: "ready", data: await fn() };
  } catch (err) {
    console.error("[dashboard module error]", err instanceof Error ? err.message : err);
    return { status: "error" };
  }
}

// ---------------------------------------------------------------------------
// Per-module fetchers. Each is written against the DashboardXData contract,
// not a raw table — today most simply resolve to an empty value because the
// owning table doesn't exist yet (goals/projects/tasks/habits/... arrive in
// Phases 4-9). When a phase adds its table, only the body of the matching
// function here changes to a real query; every widget keeps working as-is.
// ---------------------------------------------------------------------------

export async function getTodayData(): Promise<DashboardTodayData> {
  const tasks = await getTodayTasks();
  const mostImportantTask = tasks.find((t) => t.isMit) ?? null;
  const topThree = tasks.filter((t) => t.id !== mostImportantTask?.id).slice(0, 3);

  return {
    mostImportantTask: mostImportantTask ? toTaskSummary(mostImportantTask) : null,
    topThree: topThree.map(toTaskSummary),
  };
}

export async function getActiveProjectData(): Promise<DashboardActiveProjectData> {
  const project = await getActiveProject();
  if (!project) return { project: null };

  const nextMilestone = project.milestones.find((m) => m.status !== "done") ?? null;

  return {
    project: {
      id: project.id,
      name: project.name,
      progress: computeProjectProgress(project),
      nextMilestone: nextMilestone?.title ?? null,
      targetDate: project.deadline,
    },
  };
}

export async function getNinetyDayGoalData(): Promise<DashboardNinetyDayGoalData> {
  const cycle = await getCurrentCycle();
  if (!cycle) return { cycle: null };

  const linkedGoals = await getGoals({ quarterCycleId: cycle.id });
  const progress = computeCycleProgress(cycle, linkedGoals);

  return {
    cycle: {
      id: cycle.id,
      name: cycle.name,
      progress: progress ?? 0,
      endDate: cycle.endDate,
    },
  };
}

export async function getWeeklyPrioritiesData(): Promise<DashboardWeeklyPrioritiesData> {
  const rows = await getWeeklyPriorities();
  return { priorities: rows.map((row) => toTaskSummary(row.task)) };
}

export async function getHabitData(): Promise<DashboardHabitData> {
  const { timezone, weekStartsOn } = await getHabitTimeSettings();
  const today = todayInTimezone(timezone);
  const habits = await getHabits();
  const rangeStart = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));
  const logs = await getHabitLogs(
    habits.map((h) => h.id),
    toDateStr(rangeStart),
    toDateStr(today),
  );
  const todayStr = toDateStr(today);

  return {
    habits: habits.map((h) => {
      const habitLogs = logs.filter((l) => l.habitId === h.id);
      return {
        id: h.id,
        name: h.name,
        streak: computeStreak(h, habitLogs, today, weekStartsOn),
        completedToday: habitLogs.some((l) => l.logDate === todayStr && l.completed),
      };
    }),
  };
}

export async function getCalendarData(): Promise<DashboardCalendarData> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const items = await getCalendarItems({ start, end });

  return {
    items: items.map((item) => ({
      id: item.sourceId,
      title: item.title,
      startAt: item.startAt,
      kind: item.kind,
    })),
  };
}

export async function getFocusData(): Promise<DashboardFocusData> {
  const sessions = await getTodaySessions();
  return {
    sessionsToday: sessions.length,
    minutesToday: sessions.reduce((sum, s) => sum + s.actualMinutes, 0),
  };
}

export async function getProgressData(): Promise<DashboardProgressData> {
  // Project progress is still Phase 5 — this shows goal-metric progress only.
  const goals = await getGoals();
  const goalProgress = goals
    .map((g) => ({ label: g.title, percent: computeGoalProgress(g) }))
    .filter((g): g is { label: string; percent: number } => g.percent !== null)
    .slice(0, 5);

  return { goalProgress };
}

export async function getWeeklyScoreData(): Promise<DashboardWeeklyScoreData> {
  const reviews = await getWeeklyReviews();
  const lastCompleted = reviews.find((r) => r.status === "completed" && r.executionScore !== null);
  return { score: lastCompleted?.executionScore ?? null };
}

export async function getIdeaData(): Promise<DashboardIdeaData> {
  const ideas = await getIdeas();
  const active = ideas.filter((i) => i.status === "new" || i.status === "review_later" || i.status === "evaluating");
  return { ideas: active.slice(0, 5).map((i) => ({ id: i.id, title: i.title })) };
}

export async function getWeeklyReviewData(): Promise<DashboardWeeklyReviewData> {
  const reviews = await getWeeklyReviews(); // getWeeklyReviews() orders week_start_date desc
  const lastCompleted = reviews.find((r) => r.status === "completed");
  const currentWeekReview = reviews.find((r) => r.weekStartDate === weekStartDate());

  return {
    lastReviewCompletedAt: lastCompleted?.weekStartDate ?? null,
    reviewDueNow: currentWeekReview?.status !== "completed",
  };
}

export async function getUserData(
  supabase: SupabaseClient,
  userId: string,
  fallbackEmail: string,
): Promise<DashboardUser> {
  // profiles is real (Phase 2) — this is the one module actually querying a table.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", userId)
    .single();

  return { email: fallbackEmail, fullName: profile?.full_name ?? null };
}

/**
 * Shared auth boundary for any widget that needs the current user directly
 * (e.g. DashboardHeader's greeting) rather than through getDashboardData().
 * proxy.ts already protects every (app) route — this is defense in depth.
 */
export async function getCurrentDashboardUser(): Promise<DashboardUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("getCurrentDashboardUser called without an authenticated user");

  return getUserData(supabase, user.id, user.email ?? "");
}

/**
 * Composes the full Dashboard payload for the current authenticated user.
 * Server-only — never called from a Client Component. Ownership is derived
 * from the session (never a client-supplied id), matching every other
 * Server Action/Route Handler in this app.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // proxy.ts already protects every (app) route — this is defense in
    // depth, not the primary guard.
    throw new Error("getDashboardData called without an authenticated user");
  }

  const [
    userData,
    today,
    activeProject,
    ninetyDayGoal,
    weeklyPriorities,
    habits,
    calendar,
    focus,
    progress,
    weeklyScore,
    ideas,
    weeklyReview,
  ] = await Promise.all([
    getUserData(supabase, user.id, user.email ?? ""),
    safeModule(getTodayData),
    safeModule(getActiveProjectData),
    safeModule(getNinetyDayGoalData),
    safeModule(getWeeklyPrioritiesData),
    safeModule(getHabitData),
    safeModule(getCalendarData),
    safeModule(getFocusData),
    safeModule(getProgressData),
    safeModule(getWeeklyScoreData),
    safeModule(getIdeaData),
    safeModule(getWeeklyReviewData),
  ]);

  return {
    user: userData,
    today,
    activeProject,
    ninetyDayGoal,
    weeklyPriorities,
    habits,
    calendar,
    focus,
    progress,
    weeklyScore,
    ideas,
    weeklyReview,
  };
}
