// Phase 10 — pure-logic correctness test for the Context Engine's
// formatters (features/ai/context/format.ts). No I/O, no Supabase, no AI
// provider — run via: npx tsx tests/ai-context-format.ts
import {
  formatDecisionAssistantPrompt,
  formatEveningReviewPrompt,
  formatMorningBriefPrompt,
  formatPlanningPrompt,
  formatWeeklyCoachPrompt,
} from "../features/ai/context/format";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

// --- Morning Brief ---------------------------------------------------------

const brief = formatMorningBriefPrompt({
  today: "2026-09-03",
  todayTasks: [{ title: "Write report", priority: "high", isMit: true }],
  activeProject: { name: "Atlas OS", progress: 42 },
  weeklyPriorities: [{ title: "Ship Phase 10", done: false, isMostImportantOutcome: true }],
  todayEvents: [{ title: "Standup", startAt: "09:00" }],
  todayHabits: [{ name: "Meditate", done: false }],
  overdueCriticalTasks: [{ title: "File taxes", dueDate: "2026-08-30", priority: "critical" }],
});
assert(brief.includes("Today is 2026-09-03"), "morning brief includes today's date");
assert(brief.includes("Atlas OS") && brief.includes("42%"), "morning brief includes active project + progress");
assert(brief.includes("Ship Phase 10") && brief.includes("MIO"), "morning brief flags the MIO");
assert(brief.includes("Write report") && brief.includes("MIT"), "morning brief flags the MIT");
assert(brief.includes("File taxes"), "morning brief includes overdue/critical tasks");

const emptyBrief = formatMorningBriefPrompt({
  today: "2026-09-03",
  todayTasks: [],
  activeProject: null,
  weeklyPriorities: [],
  todayEvents: [],
  todayHabits: [],
  overdueCriticalTasks: [],
});
assert(emptyBrief.includes("No Active Project set"), "morning brief handles no active project");
assert(emptyBrief.includes("No tasks scheduled"), "morning brief handles no tasks");
assert(!emptyBrief.includes("Overdue or critical"), "morning brief omits overdue section when empty");

// --- Evening Review ----------------------------------------------------------

const review = formatEveningReviewPrompt({
  today: "2026-09-03",
  plannedCount: 5,
  completedTasks: [{ title: "Write report" }, { title: "Review PR" }],
  focusMinutes: 120,
  habits: [
    { name: "Meditate", done: true },
    { name: "Read", done: false },
  ],
});
assert(review.includes("Completed 2 of 5 planned tasks"), "evening review counts completed vs. planned");
assert(review.includes("120 minutes"), "evening review includes focus minutes");
assert(review.includes("1 of 2 marked done"), "evening review counts habits done");

// --- Weekly Coach ------------------------------------------------------------

const coach = formatWeeklyCoachPrompt({
  weekStartDate: "2026-08-31",
  weeklyPriorityTotal: 3,
  weeklyPriorityCompleted: 1,
  priorityDetail: [
    { title: "Ship Phase 10", done: true },
    { title: "Write ADRs", done: false },
    { title: "Fix RLS gap", done: false },
  ],
  habitConsistencyAvgPct: 66.6,
  focusMinutes: 300,
  overdueTaskCount: 2,
  recentScores: [
    { weekStartDate: "2026-08-24", score: 70 },
    { weekStartDate: "2026-08-17", score: null },
  ],
});
assert(coach.includes("1 of 3 completed"), "weekly coach counts priority completion");
assert(coach.includes("Write ADRs") && coach.includes("Fix RLS gap"), "weekly coach lists missed priorities");
assert(!coach.includes("Ship Phase 10\n") && !coach.includes("Missed: Ship Phase 10"), "weekly coach excludes completed priorities from the missed list");
assert(coach.includes("67%"), "weekly coach rounds habit consistency");
assert(coach.includes("70%") && coach.includes("n/a"), "weekly coach renders recent scores including a null score as n/a");

// --- Planning Assistant ------------------------------------------------------

const planning = formatPlanningPrompt({
  targetType: "project",
  targetTitle: "Launch CDL business",
  description: "Get licensed and start hauling.",
  lifeAreaOrGoal: "Get CDL license",
  existingItems: [
    { title: "Pass permit test", kind: "milestone" },
    { title: "Call trucking school", kind: "task" },
  ],
});
assert(planning.includes('Breaking down the project "Launch CDL business"'), "planning names the target");
assert(planning.includes("Linked Goal: Get CDL license"), "planning names the linked goal for a project");
assert(planning.includes("Pass permit test (milestone)"), "planning lists existing items to avoid duplicating");

const planningGoal = formatPlanningPrompt({
  targetType: "goal",
  targetTitle: "Get CDL license",
  description: null,
  lifeAreaOrGoal: "Career",
  existingItems: [],
});
assert(planningGoal.includes("Life Area: Career"), "planning names the life area for a goal");
assert(planningGoal.includes("Nothing broken down yet"), "planning handles no existing items");

// --- Decision Assistant -------------------------------------------------------

const decisionText = formatDecisionAssistantPrompt({
  title: "Buy vs lease the truck",
  context: "Need reliable equipment within budget.",
  options: ["Buy used", "Lease new"],
  relatedDecisions: [
    { title: "Buy vs lease the trailer", chosenOption: "Lease new", actualOutcome: "Worked out well", lesson: "Leasing reduced upfront risk" },
  ],
});
assert(decisionText.includes("Buy used") && decisionText.includes("Lease new"), "decision assistant lists options");
assert(decisionText.includes("lesson: Leasing reduced upfront risk"), "decision assistant surfaces related decisions' lessons");

const decisionNoRelated = formatDecisionAssistantPrompt({
  title: "Pick a name",
  context: null,
  options: [],
  relatedDecisions: [],
});
assert(decisionNoRelated.includes("No options listed yet"), "decision assistant handles no options");
assert(decisionNoRelated.includes("No related past decisions found"), "decision assistant handles no related decisions");

console.log("\nAll AI context formatter tests passed.");
