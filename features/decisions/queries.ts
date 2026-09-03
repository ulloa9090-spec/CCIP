import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Decision } from "./types";

const DECISION_SELECT = `
  id, title, context, options, chosen_option, reasoning, decided_at, expected_outcome,
  review_date, actual_outcome, lesson, goal_id, project_id, task_id,
  goals ( title ), projects ( name ), tasks ( title )
`;

interface DecisionRow {
  id: string;
  title: string;
  context: string | null;
  options: string[] | null;
  chosen_option: string | null;
  reasoning: string | null;
  decided_at: string;
  expected_outcome: string | null;
  review_date: string | null;
  actual_outcome: string | null;
  lesson: string | null;
  goal_id: string | null;
  project_id: string | null;
  task_id: string | null;
  goals: { title: string } | null;
  projects: { name: string } | null;
  tasks: { title: string } | null;
}

function mapRow(row: DecisionRow): Decision {
  return {
    id: row.id,
    title: row.title,
    context: row.context,
    options: row.options ?? [],
    chosenOption: row.chosen_option,
    reasoning: row.reasoning,
    decidedAt: row.decided_at,
    expectedOutcome: row.expected_outcome,
    reviewDate: row.review_date,
    actualOutcome: row.actual_outcome,
    lesson: row.lesson,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? null,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    taskId: row.task_id,
    taskTitle: row.tasks?.title ?? null,
  };
}

export async function getDecisions(): Promise<Decision[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .select(DECISION_SELECT)
    .order("decided_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as DecisionRow[]).map(mapRow);
}

export async function getDecisionById(id: string): Promise<Decision | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("decisions").select(DECISION_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as unknown as DecisionRow);
}

/** A decision with a review_date on/before today and no actual_outcome yet
 * is "due for review" (blueprint §I.6) — surfaced once, not repeatedly,
 * because filling in the outcome is what removes it from this list. */
export async function getDueForReview(): Promise<Decision[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("decisions")
    .select(DECISION_SELECT)
    .lte("review_date", today)
    .is("actual_outcome", null)
    .not("review_date", "is", null)
    .order("review_date", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as unknown as DecisionRow[]).map(mapRow);
}
