/**
 * Dashboard-facing data contracts (Phase 3, blueprint §G/§K).
 *
 * These types are what the Dashboard UI depends on — never a raw table row.
 * Phases 4-9 populate the "not yet available" fields as their own tables
 * land; when they do, only features/dashboard/get-dashboard-data.ts needs
 * to change (real queries instead of static empty values) — every widget
 * keeps rendering the same shape it already renders today.
 */

export interface TaskSummary {
  id: string;
  title: string;
  dueDate: string | null;
  projectName: string | null;
}

export interface DashboardUser {
  email: string;
  fullName: string | null;
}

export interface DashboardTodayData {
  mostImportantTask: TaskSummary | null;
  topThree: TaskSummary[];
}

export interface DashboardActiveProjectData {
  project: {
    id: string;
    name: string;
    progress: number;
    nextMilestone: string | null;
    targetDate: string | null;
  } | null;
}

export interface DashboardNinetyDayGoalData {
  cycle: {
    id: string;
    name: string;
    progress: number;
    endDate: string | null;
  } | null;
}

export interface DashboardWeeklyPrioritiesData {
  priorities: TaskSummary[];
}

export interface DashboardHabitData {
  habits: {
    id: string;
    name: string;
    streak: number;
    completedToday: boolean;
  }[];
}

export interface DashboardCalendarData {
  items: {
    id: string;
    title: string;
    startAt: string;
    kind: "time_block" | "event" | "due_date";
  }[];
}

export interface DashboardFocusData {
  sessionsToday: number;
  minutesToday: number;
}

export interface DashboardProgressData {
  goalProgress: { label: string; percent: number }[];
}

export interface DashboardWeeklyScoreData {
  score: number | null;
}

export interface DashboardIdeaData {
  ideas: { id: string; title: string }[];
}

export interface DashboardWeeklyReviewData {
  lastReviewCompletedAt: string | null;
  reviewDueNow: boolean;
}

export type ActivityItemType = "task" | "habit" | "focus" | "journal" | "idea" | "review";

export interface DashboardActivityItem {
  id: string;
  type: ActivityItemType;
  title: string;
  /** Date or ISO timestamp string — always lexically sortable/comparable. */
  occurredAt: string;
}

export interface DashboardActivityData {
  items: DashboardActivityItem[];
}

/**
 * A module's data plus how it got there — lets each widget render a
 * loading/error/empty/ready state without every module needing its own
 * bespoke union (Phase 3 §8: a failed module must not crash the page).
 */
export type ModuleResult<T> = { status: "ready"; data: T } | { status: "error" };

export interface DashboardData {
  user: DashboardUser;
  today: ModuleResult<DashboardTodayData>;
  activeProject: ModuleResult<DashboardActiveProjectData>;
  ninetyDayGoal: ModuleResult<DashboardNinetyDayGoalData>;
  weeklyPriorities: ModuleResult<DashboardWeeklyPrioritiesData>;
  habits: ModuleResult<DashboardHabitData>;
  calendar: ModuleResult<DashboardCalendarData>;
  focus: ModuleResult<DashboardFocusData>;
  progress: ModuleResult<DashboardProgressData>;
  weeklyScore: ModuleResult<DashboardWeeklyScoreData>;
  ideas: ModuleResult<DashboardIdeaData>;
  weeklyReview: ModuleResult<DashboardWeeklyReviewData>;
  activity: ModuleResult<DashboardActivityData>;
}
