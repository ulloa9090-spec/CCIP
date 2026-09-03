"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { journalEntrySchema } from "@/lib/validation/journal";
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

function revalidateJournalViews() {
  revalidatePath("/journal");
  revalidatePath("/dashboard");
}

function parseJournalForm(formData: FormData) {
  return journalEntrySchema.safeParse({
    category: formData.get("category") || "free_note",
    body: formData.get("body"),
    goalId: formData.get("goalId"),
    projectId: formData.get("projectId"),
    taskId: formData.get("taskId"),
    decisionId: formData.get("decisionId"),
  });
}

export async function createJournalEntry(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseJournalForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("journal_entries").insert({
    user_id: userId,
    category: parsed.data.category,
    body: parsed.data.body,
    goal_id: parsed.data.goalId || null,
    project_id: parsed.data.projectId || null,
    task_id: parsed.data.taskId || null,
    decision_id: parsed.data.decisionId || null,
  });

  if (error) return { error: "Couldn't save that entry. Try again." };

  revalidateJournalViews();
  return { message: "Entry saved." };
}

export async function updateJournalEntry(
  entryId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseJournalForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("journal_entries")
    .update({
      category: parsed.data.category,
      body: parsed.data.body,
      goal_id: parsed.data.goalId || null,
      project_id: parsed.data.projectId || null,
      task_id: parsed.data.taskId || null,
      decision_id: parsed.data.decisionId || null,
    })
    .eq("id", entryId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidateJournalViews();
  return { message: "Saved." };
}

export async function deleteJournalEntry(entryId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("journal_entries").delete().eq("id", entryId);

  revalidateJournalViews();
}
