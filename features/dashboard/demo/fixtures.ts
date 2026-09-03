/**
 * DEV-ONLY fixture data for visually verifying the Dashboard widget grid
 * (Phase 3 §13). Never imported by app/(app)/dashboard/page.tsx or any
 * other production route — only by app/dev/dashboard-preview, which is
 * unauthenticated, unlinked from navigation, and outside proxy.ts's
 * protected-route list. Nothing here is written to Supabase; it exists
 * purely so the same widget "*CardBody" components used in production can
 * be rendered with representative data for visual/responsive/accessibility
 * QA when there are no real goals/projects/tasks/habits tables yet.
 *
 * Safe to delete this whole directory (and app/dev/dashboard-preview) at
 * any time without touching production behavior.
 */
import type {
  DashboardActiveProjectData,
  DashboardCalendarData,
  DashboardFocusData,
  DashboardHabitData,
  DashboardIdeaData,
  DashboardNinetyDayGoalData,
  DashboardProgressData,
  DashboardTodayData,
  DashboardWeeklyPrioritiesData,
  DashboardWeeklyReviewData,
  DashboardWeeklyScoreData,
  ModuleResult,
} from "@/features/dashboard/types";

function ready<T>(data: T): ModuleResult<T> {
  return { status: "ready", data };
}

export const emptyFixtures = {
  today: ready<DashboardTodayData>({ mostImportantTask: null, topThree: [] }),
  activeProject: ready<DashboardActiveProjectData>({ project: null }),
  ninetyDayGoal: ready<DashboardNinetyDayGoalData>({ cycle: null }),
  weeklyPriorities: ready<DashboardWeeklyPrioritiesData>({ priorities: [] }),
  habits: ready<DashboardHabitData>({ habits: [] }),
  calendar: ready<DashboardCalendarData>({ items: [] }),
  focus: ready<DashboardFocusData>({ sessionsToday: 0, minutesToday: 0 }),
  progress: ready<DashboardProgressData>({ goalProgress: [] }),
  weeklyScore: ready<DashboardWeeklyScoreData>({ score: null }),
  ideas: ready<DashboardIdeaData>({ ideas: [] }),
  weeklyReview: ready<DashboardWeeklyReviewData>({
    lastReviewCompletedAt: null,
    reviewDueNow: false,
  }),
};

export const populatedFixtures = {
  today: ready<DashboardTodayData>({
    mostImportantTask: { id: "t1", title: "Finish CDL permit study module 5", dueDate: null, projectName: "Licencia CDL" },
    topThree: [
      { id: "t2", title: "Call the trucking school", dueDate: null, projectName: "Licencia CDL" },
      { id: "t3", title: "30 min exercise", dueDate: null, projectName: null },
    ],
  }),
  activeProject: ready<DashboardActiveProjectData>({
    project: {
      id: "p1",
      name: "Licencia CDL + Negocio Transporte",
      progress: 45,
      nextMilestone: "Complete practical training",
      targetDate: "2026-11-30",
    },
  }),
  ninetyDayGoal: ready<DashboardNinetyDayGoalData>({
    cycle: { id: "c1", name: "Obtener licencia CDL y lanzar el negocio", progress: 45, endDate: "2026-11-30" },
  }),
  weeklyPriorities: ready<DashboardWeeklyPrioritiesData>({
    priorities: [
      { id: "t2", title: "Call the trucking school", dueDate: null, projectName: "Licencia CDL" },
      { id: "t4", title: "Study modules 5-7", dueDate: null, projectName: "Licencia CDL" },
      { id: "t5", title: "Create financial plan draft", dueDate: null, projectName: "Licencia CDL" },
    ],
  }),
  habits: ready<DashboardHabitData>({
    habits: [
      { id: "h1", name: "Deep work (min. 1h)", streak: 6, completedToday: true },
      { id: "h2", name: "Exercise (30 min)", streak: 5, completedToday: false },
      { id: "h3", name: "Read (20 min)", streak: 4, completedToday: true },
    ],
  }),
  calendar: ready<DashboardCalendarData>({
    items: [
      { id: "e1", title: "Study CDL — 7:00-8:30", startAt: new Date().toISOString(), kind: "time_block" },
      { id: "e2", title: "Call trucking school", startAt: new Date().toISOString(), kind: "event" },
    ],
  }),
  focus: ready<DashboardFocusData>({ sessionsToday: 2, minutesToday: 75 }),
  progress: ready<DashboardProgressData>({
    goalProgress: [
      { label: "Licencia CDL + Negocio Transporte", percent: 45 },
      { label: "90-Day Cycle", percent: 45 },
    ],
  }),
  weeklyScore: ready<DashboardWeeklyScoreData>({ score: 72 }),
  ideas: ready<DashboardIdeaData>({
    ideas: [
      { id: "i1", title: "Negocio de lavado de camiones" },
      { id: "i2", title: "Plataforma de educación online" },
    ],
  }),
  weeklyReview: ready<DashboardWeeklyReviewData>({
    lastReviewCompletedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewDueNow: true,
  }),
};

export const errorFixtures = {
  today: { status: "error" } as ModuleResult<DashboardTodayData>,
};
