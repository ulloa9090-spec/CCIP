/**
 * blueprint §M.2 — the pure half of every Context Engine builder: given
 * already-fetched domain data, produce the text block sent to the model.
 * No I/O, no Supabase — `build.ts` does the fetching and hands off here.
 * Deliberately capped list lengths (not a character-count truncation) so
 * the token budget is bounded by what's included, never by chopping a
 * sentence in half.
 */

export interface MorningBriefData {
  today: string;
  todayTasks: { title: string; priority: string; isMit: boolean }[];
  activeProject: { name: string; progress: number | null } | null;
  weeklyPriorities: { title: string; done: boolean; isMostImportantOutcome: boolean }[];
  todayEvents: { title: string; startAt: string }[];
  todayHabits: { name: string; done: boolean }[];
  overdueCriticalTasks: { title: string; dueDate: string | null; priority: string }[];
}

export function formatMorningBriefPrompt(data: MorningBriefData): string {
  const lines: string[] = [`Today is ${data.today}.`];

  lines.push(
    data.activeProject
      ? `Active Project: ${data.activeProject.name}${data.activeProject.progress !== null ? ` (${data.activeProject.progress}% complete)` : ""}.`
      : "No Active Project set.",
  );

  lines.push(
    data.weeklyPriorities.length > 0
      ? `This week's priorities: ${data.weeklyPriorities
          .slice(0, 3)
          .map((p) => `${p.title}${p.isMostImportantOutcome ? " (MIO)" : ""}${p.done ? " [done]" : ""}`)
          .join("; ")}.`
      : "No weekly priorities set.",
  );

  lines.push(
    data.todayTasks.length > 0
      ? `Today's tasks: ${data.todayTasks
          .slice(0, 10)
          .map((t) => `${t.title} (${t.priority}${t.isMit ? ", MIT" : ""})`)
          .join("; ")}.`
      : "No tasks scheduled for today.",
  );

  lines.push(
    data.todayEvents.length > 0
      ? `Today's calendar: ${data.todayEvents.slice(0, 8).map((e) => `${e.title} at ${e.startAt}`).join("; ")}.`
      : "Nothing on the calendar today.",
  );

  lines.push(
    data.todayHabits.length > 0
      ? `Today's habits: ${data.todayHabits.slice(0, 10).map((h) => `${h.name}${h.done ? " [done]" : ""}`).join("; ")}.`
      : "No habits due today.",
  );

  if (data.overdueCriticalTasks.length > 0) {
    lines.push(
      `Overdue or critical: ${data.overdueCriticalTasks
        .slice(0, 8)
        .map((t) => `${t.title}${t.dueDate ? ` (due ${t.dueDate})` : ""}`)
        .join("; ")}.`,
    );
  }

  return lines.join("\n");
}

export interface EveningReviewData {
  today: string;
  plannedCount: number;
  completedTasks: { title: string }[];
  focusMinutes: number;
  habits: { name: string; done: boolean }[];
}

export function formatEveningReviewPrompt(data: EveningReviewData): string {
  const lines: string[] = [`Today is ${data.today}, reviewing the day.`];

  lines.push(`Completed ${data.completedTasks.length} of ${data.plannedCount} planned tasks.`);
  if (data.completedTasks.length > 0) {
    lines.push(`Completed: ${data.completedTasks.slice(0, 10).map((t) => t.title).join("; ")}.`);
  }
  lines.push(`Focus time today: ${data.focusMinutes} minutes.`);

  const doneHabits = data.habits.filter((h) => h.done);
  lines.push(
    data.habits.length > 0
      ? `Habits: ${doneHabits.length} of ${data.habits.length} marked done (${data.habits.map((h) => `${h.name}${h.done ? " [done]" : " [missed]"}`).join("; ")}).`
      : "No habits due today.",
  );

  return lines.join("\n");
}

export interface WeeklyCoachData {
  weekStartDate: string;
  weeklyPriorityTotal: number;
  weeklyPriorityCompleted: number;
  priorityDetail: { title: string; done: boolean }[];
  habitConsistencyAvgPct: number | null;
  focusMinutes: number;
  overdueTaskCount: number;
  recentScores: { weekStartDate: string; score: number | null }[];
}

export function formatWeeklyCoachPrompt(data: WeeklyCoachData): string {
  const lines: string[] = [`Coaching for the week of ${data.weekStartDate}.`];

  lines.push(`Weekly priorities: ${data.weeklyPriorityCompleted} of ${data.weeklyPriorityTotal} completed.`);
  if (data.priorityDetail.length > 0) {
    const missed = data.priorityDetail.filter((p) => !p.done).map((p) => p.title);
    if (missed.length > 0) lines.push(`Missed: ${missed.join("; ")}.`);
  }

  lines.push(
    data.habitConsistencyAvgPct !== null
      ? `Habit consistency this week: ${Math.round(data.habitConsistencyAvgPct)}%.`
      : "No habits tracked this week.",
  );

  lines.push(`Focus time: ${data.focusMinutes} minutes. Overdue tasks: ${data.overdueTaskCount}.`);

  if (data.recentScores.length > 0) {
    lines.push(
      `Recent Weekly Execution Scores: ${data.recentScores
        .map((s) => `${s.weekStartDate}: ${s.score === null ? "n/a" : `${s.score}%`}`)
        .join("; ")}.`,
    );
  }

  return lines.join("\n");
}

export interface PlanningData {
  targetType: "goal" | "project";
  targetTitle: string;
  description: string | null;
  lifeAreaOrGoal: string | null;
  existingItems: { title: string; kind: "milestone" | "task" }[];
}

export function formatPlanningPrompt(data: PlanningData): string {
  const lines: string[] = [`Breaking down the ${data.targetType} "${data.targetTitle}".`];

  if (data.description) lines.push(`Description: ${data.description}`);
  if (data.lifeAreaOrGoal) {
    lines.push(
      data.targetType === "goal" ? `Life Area: ${data.lifeAreaOrGoal}.` : `Linked Goal: ${data.lifeAreaOrGoal}.`,
    );
  }

  lines.push(
    data.existingItems.length > 0
      ? `Already exists (avoid duplicating): ${data.existingItems
          .slice(0, 20)
          .map((i) => `${i.title} (${i.kind})`)
          .join("; ")}.`
      : "Nothing broken down yet.",
  );

  return lines.join("\n");
}

export interface DecisionAssistantData {
  title: string;
  context: string | null;
  options: string[];
  relatedDecisions: { title: string; chosenOption: string | null; actualOutcome: string | null; lesson: string | null }[];
}

export function formatDecisionAssistantPrompt(data: DecisionAssistantData): string {
  const lines: string[] = [`Decision: "${data.title}".`];

  if (data.context) lines.push(`Context: ${data.context}`);
  lines.push(data.options.length > 0 ? `Options considered: ${data.options.join("; ")}.` : "No options listed yet.");

  if (data.relatedDecisions.length > 0) {
    lines.push(
      `Related past decisions: ${data.relatedDecisions
        .slice(0, 5)
        .map((d) => {
          const outcome = d.actualOutcome ? ` → ${d.actualOutcome}` : "";
          const lesson = d.lesson ? ` (lesson: ${d.lesson})` : "";
          return `"${d.title}" chose "${d.chosenOption ?? "n/a"}"${outcome}${lesson}`;
        })
        .join("; ")}.`,
    );
  } else {
    lines.push("No related past decisions found.");
  }

  return lines.join("\n");
}
