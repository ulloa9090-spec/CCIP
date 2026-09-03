// Phase 11 — pure-logic correctness test for the Automation engine's
// trigger-matching (features/automations/match.ts). No I/O, no Supabase —
// run via: npx tsx tests/automation-match.ts
import {
  computeMostRecentScheduledFireTime,
  daysBetween,
  isTaskOverdueCheckDue,
  isWeeklyScheduleDue,
  matchingOverdueTasks,
} from "../features/automations/match";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

// --- daysBetween -------------------------------------------------------------

assert(daysBetween("2026-08-30", "2026-09-03") === 4, "daysBetween counts whole UTC calendar days");
assert(daysBetween("2026-09-03", "2026-09-03") === 0, "daysBetween is 0 for the same day");

// --- isTaskOverdueCheckDue ----------------------------------------------------

assert(isTaskOverdueCheckDue(null, "2026-09-03"), "task_overdue is due when it has never run");
assert(!isTaskOverdueCheckDue("2026-09-03T08:00:00.000Z", "2026-09-03"), "task_overdue is not due again the same UTC day");
assert(isTaskOverdueCheckDue("2026-09-02T23:59:00.000Z", "2026-09-03"), "task_overdue is due again on a new UTC day");

// --- matchingOverdueTasks ------------------------------------------------------

const tasks = [
  { dueDate: "2026-08-30", priority: "critical" }, // 4 days overdue
  { dueDate: "2026-09-01", priority: "medium" }, // 2 days overdue
  { dueDate: "2026-09-03", priority: "critical" }, // 0 days overdue (due today, not overdue)
];

const noConditionMatches = matchingOverdueTasks(tasks, { minDays: 3 }, null, "2026-09-03");
assert(noConditionMatches.length === 1 && noConditionMatches[0]!.priority === "critical", "matchingOverdueTasks applies minDays with no priority filter");

const withConditionMatches = matchingOverdueTasks(tasks, { minDays: 1 }, { priorities: ["critical"] }, "2026-09-03");
assert(withConditionMatches.length === 1, "matchingOverdueTasks applies the priority condition on top of minDays");

const emptyPrioritiesMatches = matchingOverdueTasks(tasks, { minDays: 1 }, { priorities: [] }, "2026-09-03");
assert(emptyPrioritiesMatches.length === 2, "an empty priorities condition matches any priority, same as no condition");

// --- computeMostRecentScheduledFireTime / isWeeklyScheduleDue -----------------

// 2026-09-03 is a Thursday (day 4).
const thursday10am = new Date("2026-09-03T10:00:00.000Z");
const sundayScheduled = computeMostRecentScheduledFireTime(0, 18, thursday10am);
assert(sundayScheduled.toISOString() === "2026-08-30T18:00:00.000Z", "the most recent Sunday 18:00 before a Thursday is 4 days earlier");

const sunday10am = new Date("2026-08-30T10:00:00.000Z");
const notYetToday = computeMostRecentScheduledFireTime(0, 18, sunday10am);
assert(notYetToday.toISOString() === "2026-08-23T18:00:00.000Z", "on the scheduled day but before the scheduled hour, the most recent fire is last week's");

const sunday7pm = new Date("2026-08-30T19:00:00.000Z");
const alreadyToday = computeMostRecentScheduledFireTime(0, 18, sunday7pm);
assert(alreadyToday.toISOString() === "2026-08-30T18:00:00.000Z", "on the scheduled day after the scheduled hour, the most recent fire is today's");

assert(isWeeklyScheduleDue({ dayOfWeek: 0, hour: 18 }, null, thursday10am), "weekly_schedule is due when it has never run");
assert(
  !isWeeklyScheduleDue({ dayOfWeek: 0, hour: 18 }, "2026-08-30T18:00:00.000Z", thursday10am),
  "weekly_schedule is not due again before the next scheduled occurrence",
);
assert(
  isWeeklyScheduleDue({ dayOfWeek: 0, hour: 18 }, "2026-08-23T18:00:00.000Z", thursday10am),
  "weekly_schedule is due again once a new scheduled occurrence has passed",
);

console.log("\nAll automation matching tests passed.");
