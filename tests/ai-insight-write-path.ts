// Phase 10 — de-risks the one genuinely new piece of `approveInsight()`
// (features/ai/actions.ts): does the FormData it programmatically builds
// actually pass the same Zod validation `createTask`/`addMilestone`
// (pre-existing, already-shipped Server Actions) apply to a real form
// submission? `createTask`/`addMilestone` themselves can't run outside a
// Next.js request (they call `cookies()` via `createClient()`), so this
// tests the shared, dependency-free validation layer directly instead —
// run via: npx tsx tests/ai-insight-write-path.ts
import { taskSchema } from "../lib/validation/tasks";
import { milestoneSchema } from "../lib/validation/projects";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

// --- plan_breakdown → createTask's FormData shape ---------------------------

function buildTaskFormLikeApproveInsight(item: { title: string; priority?: string }, targetType: "goal" | "project", targetId: string) {
  return {
    title: item.title,
    description: "",
    projectId: targetType === "project" ? targetId : "",
    goalId: targetType === "goal" ? targetId : "",
    status: "inbox",
    priority: item.priority ?? "medium",
    dueDate: "",
    scheduledDate: "",
  };
}

// Real v4-shaped UUIDs (matching what Postgres's gen_random_uuid() produces
// — the fixture ids used elsewhere in this project's RLS tests, e.g.
// 11111111-1111-1111-1111-111111111111, are deliberately memorable but are
// NOT RFC4122-compliant on the variant nibble, so Zod's strict .uuid()
// rejects them here even though Postgres's own uuid type doesn't care).
const PROJECT_ID = "0d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";
const GOAL_ID = "1a2b3c4d-5e6f-4a7b-9c8d-2e3f4a5b6c7d";

const projectTaskInput = buildTaskFormLikeApproveInsight({ title: "Call trucking school" }, "project", PROJECT_ID);
const projectTaskResult = taskSchema.safeParse(projectTaskInput);
assert(projectTaskResult.success, "a plan_breakdown task item targeting a project passes taskSchema");

const goalTaskInput = buildTaskFormLikeApproveInsight({ title: "Study for CDL exam", priority: "high" }, "goal", GOAL_ID);
const goalTaskResult = taskSchema.safeParse(goalTaskInput);
assert(goalTaskResult.success, "a plan_breakdown task item targeting a goal (with an explicit priority) passes taskSchema");
if (goalTaskResult.success) {
  assert(goalTaskResult.data.goalId === GOAL_ID, "goalId is set, not projectId, for a goal target");
  assert(goalTaskResult.data.projectId === "", "projectId is left empty for a goal target");
}

const emptyTitleInput = buildTaskFormLikeApproveInsight({ title: "" }, "project", PROJECT_ID);
assert(!taskSchema.safeParse(emptyTitleInput).success, "an empty AI-suggested title is rejected by taskSchema, same as a human's would be");

// --- plan_breakdown milestone item → addMilestone's FormData shape ---------

const milestoneInput = { title: "Pass CDL permit test", targetDate: "" };
assert(milestoneSchema.safeParse(milestoneInput).success, "a plan_breakdown milestone item passes milestoneSchema");

// --- suggest_reschedule's date guard (mirrors rescheduleTask's inline regex) -

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
assert(DATE_RE.test("2026-09-10"), "a well-formed yyyy-mm-dd reschedule date passes the guard");
assert(!DATE_RE.test("not-a-date"), "a malformed reschedule date is rejected by the guard");
assert(!DATE_RE.test(""), "an empty reschedule date is rejected by the guard");

console.log("\nAll AI insight write-path tests passed.");
