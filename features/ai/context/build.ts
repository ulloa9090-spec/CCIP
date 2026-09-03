import "server-only";
import { addDays } from "date-fns";
import { getTodayTasks, getOverdueAndCriticalTasks, getWeeklyPriorities, getTasks, weekStartDate } from "@/features/tasks/queries";
import { getActiveProject, getProjectById } from "@/features/projects/queries";
import { getGoalById } from "@/features/goals/queries";
import { getCalendarItems } from "@/features/calendar/queries";
import { getTodaySessions } from "@/features/focus/queries";
import { getHabits, getHabitLogs, getHabitTimeSettings } from "@/features/habits/queries";
import { isHabitDueOn, toDateStr, todayInTimezone } from "@/features/habits/progress";
import { computeWeeklyMetrics } from "@/features/reviews/aggregate";
import { getWeeklyReviews } from "@/features/reviews/queries";
import { getDecisionById, getDecisions } from "@/features/decisions/queries";
import type { ContextPayload } from "./types";
import {
  formatDecisionAssistantPrompt,
  formatEveningReviewPrompt,
  formatMorningBriefPrompt,
  formatPlanningPrompt,
  formatWeeklyCoachPrompt,
} from "./format";

/** blueprint §M.2 Morning Brief: today's tasks, active project snapshot,
 * weekly priorities, today's calendar, today's habits, overdue-critical
 * tasks — the same slice Dashboard's own widgets already assemble
 * (Phases 3–9), reused rather than re-derived. */
export async function buildMorningBriefContext(): Promise<ContextPayload> {
  const { timezone } = await getHabitTimeSettings();
  const today = todayInTimezone(timezone);
  const todayStr = toDateStr(today);
  const dayStart = new Date(`${todayStr}T00:00:00`);
  const dayEnd = addDays(dayStart, 1);

  const [todayTasksRaw, activeProject, weeklyPriorityRows, todayEventsRaw, overdueCriticalRaw, habits] =
    await Promise.all([
      getTodayTasks(),
      getActiveProject(),
      getWeeklyPriorities(weekStartDate(today)),
      getCalendarItems({ start: dayStart, end: dayEnd }),
      getOverdueAndCriticalTasks(),
      getHabits(),
    ]);

  const dueHabits = habits.filter((h) => h.startDate <= todayStr && isHabitDueOn(h, today));
  const logs = dueHabits.length > 0 ? await getHabitLogs(dueHabits.map((h) => h.id), todayStr, todayStr) : [];
  const doneHabitIds = new Set(logs.filter((l) => l.completed).map((l) => l.habitId));

  const data = {
    today: todayStr,
    todayTasks: todayTasksRaw.map((t) => ({ title: t.title, priority: t.priority, isMit: t.isMit })),
    activeProject: activeProject ? { name: activeProject.name, progress: activeProject.progressOverride } : null,
    weeklyPriorities: weeklyPriorityRows.map((p) => ({
      title: p.task.title,
      done: p.task.status === "done",
      isMostImportantOutcome: p.isMostImportantOutcome,
    })),
    todayEvents: todayEventsRaw.map((e) => ({ title: e.title, startAt: e.startAt })),
    todayHabits: dueHabits.map((h) => ({ name: h.name, done: doneHabitIds.has(h.id) })),
    overdueCriticalTasks: overdueCriticalRaw.map((t) => ({ title: t.title, dueDate: t.dueDate, priority: t.priority })),
  };

  return {
    contextType: "morning_brief",
    summary: data,
    promptText: formatMorningBriefPrompt(data),
  };
}

/** blueprint §M.2 Evening Review: today's completed vs. planned tasks,
 * today's focus minutes, today's habit marks. */
export async function buildEveningReviewContext(): Promise<ContextPayload> {
  const { timezone } = await getHabitTimeSettings();
  const today = todayInTimezone(timezone);
  const todayStr = toDateStr(today);

  const [todayTasks, sessions, habits] = await Promise.all([getTodayTasks(), getTodaySessions(), getHabits()]);

  const dueHabits = habits.filter((h) => h.startDate <= todayStr && isHabitDueOn(h, today));
  const logs = dueHabits.length > 0 ? await getHabitLogs(dueHabits.map((h) => h.id), todayStr, todayStr) : [];
  const doneHabitIds = new Set(logs.filter((l) => l.completed).map((l) => l.habitId));

  const data = {
    today: todayStr,
    plannedCount: todayTasks.length,
    completedTasks: todayTasks.filter((t) => t.status === "done").map((t) => ({ title: t.title })),
    focusMinutes: sessions.reduce((sum, s) => sum + s.actualMinutes, 0),
    habits: dueHabits.map((h) => ({ name: h.name, done: doneHabitIds.has(h.id) })),
  };

  return {
    contextType: "evening_review",
    summary: data,
    promptText: formatEveningReviewPrompt(data),
  };
}

/** blueprint §M.2 Weekly Coach: the week's aggregated metrics (the same
 * `auto_summary` shape the Weekly Review screen already computes — reused,
 * not recomputed differently for AI), completed/missed priorities, habit
 * consistency, focus sessions, last 4 weeks of review history for trend. */
export async function buildWeeklyCoachContext(weekStart: string = weekStartDate()): Promise<ContextPayload> {
  const weekStartDateObj = new Date(`${weekStart}T00:00:00`);

  const [metrics, priorityRows, allReviews] = await Promise.all([
    computeWeeklyMetrics(weekStartDateObj),
    getWeeklyPriorities(weekStart),
    getWeeklyReviews(),
  ]);

  const fourWeeksAgo = toDateStr(addDays(weekStartDateObj, -28));
  const recentScores = allReviews
    .filter((r) => r.status === "completed" && r.weekStartDate >= fourWeeksAgo && r.weekStartDate < weekStart)
    .slice(0, 4)
    .map((r) => ({ weekStartDate: r.weekStartDate, score: r.executionScore }));

  const data = {
    weekStartDate: weekStart,
    weeklyPriorityTotal: metrics.weeklyPriorityTotal,
    weeklyPriorityCompleted: metrics.weeklyPriorityCompleted,
    priorityDetail: priorityRows.map((p) => ({ title: p.task.title, done: p.task.status === "done" })),
    habitConsistencyAvgPct: metrics.habitConsistencyAvgPct,
    focusMinutes: metrics.focusMinutes,
    overdueTaskCount: metrics.overdueTaskCount,
    recentScores,
  };

  return {
    contextType: "weekly_coach",
    summary: data,
    promptText: formatWeeklyCoachPrompt(data),
  };
}

/** blueprint §M.2 Planning Assistant: the target Goal/Project being broken
 * down, its existing milestones/tasks (to avoid duplicate suggestions),
 * linked Life Area. */
export async function buildPlanningContext(targetType: "goal" | "project", targetId: string): Promise<ContextPayload> {
  const allTasks = await getTasks();

  if (targetType === "goal") {
    const goal = await getGoalById(targetId);
    if (!goal) throw new Error("Goal not found.");
    const existingItems = allTasks
      .filter((t) => t.goalId === targetId)
      .map((t) => ({ title: t.title, kind: "task" as const }));

    const data = {
      targetType: "goal" as const,
      targetTitle: goal.title,
      description: goal.description,
      lifeAreaOrGoal: goal.area?.name ?? null,
      existingItems,
    };
    return { contextType: "planning", summary: data, promptText: formatPlanningPrompt(data) };
  }

  const project = await getProjectById(targetId);
  if (!project) throw new Error("Project not found.");
  const existingItems = [
    ...project.milestones.map((m) => ({ title: m.title, kind: "milestone" as const })),
    ...allTasks.filter((t) => t.projectId === targetId).map((t) => ({ title: t.title, kind: "task" as const })),
  ];

  const data = {
    targetType: "project" as const,
    targetTitle: project.name,
    description: project.description,
    lifeAreaOrGoal: project.goalTitle,
    existingItems,
  };
  return { contextType: "planning", summary: data, promptText: formatPlanningPrompt(data) };
}

/** blueprint §M.2 Decision Assistant: the specific decision's
 * context/options, plus related past decisions (same `goal_id`/
 * `project_id`) for consistency. */
export async function buildDecisionAssistantContext(decisionId: string): Promise<ContextPayload> {
  const decision = await getDecisionById(decisionId);
  if (!decision) throw new Error("Decision not found.");

  const allDecisions = await getDecisions();
  const relatedDecisions = allDecisions
    .filter(
      (d) =>
        d.id !== decisionId &&
        d.actualOutcome !== null &&
        ((decision.goalId && d.goalId === decision.goalId) || (decision.projectId && d.projectId === decision.projectId)),
    )
    .map((d) => ({ title: d.title, chosenOption: d.chosenOption, actualOutcome: d.actualOutcome, lesson: d.lesson }));

  const data = {
    title: decision.title,
    context: decision.context,
    options: decision.options,
    relatedDecisions,
  };

  return {
    contextType: "decision_assistant",
    summary: data,
    promptText: formatDecisionAssistantPrompt(data),
  };
}
