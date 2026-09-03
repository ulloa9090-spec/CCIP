import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getGoals } from "@/features/goals/queries";
import { computeCycleProgress, computeGoalProgress } from "@/features/goals/progress";
import { getCurrentCycle } from "@/features/plan-90-days/queries";
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
} from "./types";

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
  // Tasks don't exist yet (Phase 5) — nothing to query.
  return { mostImportantTask: null, topThree: [] };
}

export async function getActiveProjectData(): Promise<DashboardActiveProjectData> {
  // Projects don't exist yet (Phase 5).
  return { project: null };
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
  // Weekly priorities are a flag on tasks (Phase 5) — nothing to query yet.
  return { priorities: [] };
}

export async function getHabitData(): Promise<DashboardHabitData> {
  // Habits don't exist yet (Phase 7).
  return { habits: [] };
}

export async function getCalendarData(): Promise<DashboardCalendarData> {
  // Calendar events / time blocks don't exist yet (Phase 6).
  return { items: [] };
}

export async function getFocusData(): Promise<DashboardFocusData> {
  // Focus sessions don't exist yet (Phase 7).
  return { sessionsToday: 0, minutesToday: 0 };
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
  // Weekly Execution Score (blueprint §L) needs tasks/habits/focus/reviews (Phase 9).
  return { score: null };
}

export async function getIdeaData(): Promise<DashboardIdeaData> {
  // Idea Parking Lot doesn't exist yet (Phase 8).
  return { ideas: [] };
}

export async function getWeeklyReviewData(): Promise<DashboardWeeklyReviewData> {
  // Weekly reviews don't exist yet (Phase 9).
  return { lastReviewCompletedAt: null, reviewDueNow: false };
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
