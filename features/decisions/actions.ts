"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { decisionSchema, resolveDecisionSchema } from "@/lib/validation/decisions";
import type { ActionResult } from "@/lib/types/action-result";

function flattenZodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

function revalidateDecisionViews(decisionId?: string) {
  revalidatePath("/journal");
  revalidatePath("/dashboard");
  if (decisionId) revalidatePath(`/journal/decisions/${decisionId}`);
}

function parseOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createDecision(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = decisionSchema.safeParse({
    title: formData.get("title"),
    context: formData.get("context"),
    options: formData.get("options"),
    chosenOption: formData.get("chosenOption"),
    reasoning: formData.get("reasoning"),
    expectedOutcome: formData.get("expectedOutcome"),
    reviewDate: formData.get("reviewDate"),
    goalId: formData.get("goalId"),
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: decision, error } = await supabase
    .from("decisions")
    .insert({
      user_id: userId,
      title: parsed.data.title,
      context: parsed.data.context || null,
      options: parseOptions(parsed.data.options),
      chosen_option: parsed.data.chosenOption || null,
      reasoning: parsed.data.reasoning || null,
      expected_outcome: parsed.data.expectedOutcome || null,
      review_date: parsed.data.reviewDate || null,
      goal_id: parsed.data.goalId || null,
      project_id: parsed.data.projectId || null,
      task_id: parsed.data.taskId || null,
    })
    .select("id")
    .single();

  if (error || !decision) return { error: "Couldn't log that decision. Try again." };

  revalidateDecisionViews();
  redirect(`/journal/decisions/${decision.id}`);
}

/** Records what actually happened — the only mechanism that removes a
 * decision from the "due for review" list (blueprint §I.6: surfaced once,
 * never silently reopened without new information). */
export async function resolveDecision(
  decisionId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resolveDecisionSchema.safeParse({
    actualOutcome: formData.get("actualOutcome"),
    lesson: formData.get("lesson"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("decisions")
    .update({ actual_outcome: parsed.data.actualOutcome, lesson: parsed.data.lesson || null })
    .eq("id", decisionId);

  if (error) return { error: "Couldn't save that review. Try again." };

  revalidateDecisionViews(decisionId);
  return { message: "Review saved." };
}
