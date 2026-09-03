"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskSchema, TASK_STATUSES } from "@/lib/validation/tasks";
import type { ActionResult } from "@/lib/types/action-result";
import { weekStartDate } from "./queries";
import type { TaskStatus } from "./types";

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

function revalidateTaskViews(projectId?: string | null) {
  revalidatePath("/tasks");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createTask(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    projectId: formData.get("projectId"),
    goalId: formData.get("goalId"),
    status: formData.get("status") || "inbox",
    priority: formData.get("priority") || "medium",
    dueDate: formData.get("dueDate"),
    scheduledDate: formData.get("scheduledDate"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    project_id: parsed.data.projectId || null,
    goal_id: parsed.data.goalId || null,
    title: parsed.data.title,
    description: parsed.data.description || null,
    status: parsed.data.status,
    priority: parsed.data.priority,
    due_date: parsed.data.dueDate || null,
    scheduled_date: parsed.data.scheduledDate || null,
  });

  if (error) return { error: "Couldn't create that task. Try again." };

  revalidateTaskViews(parsed.data.projectId || null);
  return { message: "Task created." };
}

export async function updateTask(
  taskId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    projectId: formData.get("projectId"),
    goalId: formData.get("goalId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate"),
    scheduledDate: formData.get("scheduledDate"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("tasks")
    .update({
      project_id: parsed.data.projectId || null,
      goal_id: parsed.data.goalId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      due_date: parsed.data.dueDate || null,
      scheduled_date: parsed.data.scheduledDate || null,
      completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidateTaskViews(parsed.data.projectId || null);
  return { message: "Saved." };
}

const VALID_STATUSES = new Set<string>(TASK_STATUSES);

/** Used by the Kanban board on drop. */
export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  if (!VALID_STATUSES.has(status)) return;

  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase
    .from("tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", taskId);

  revalidateTaskViews();
}

export async function toggleTaskDone(taskId: string, done: boolean) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase
    .from("tasks")
    .update({
      status: done ? "done" : "next",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);

  revalidateTaskViews();
}

export async function archiveTask(taskId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", taskId);

  revalidateTaskViews();
}

/** At most one MIT per day (blueprint §D.3) — clears any other task's MIT flag first. */
export async function setMostImportantTask(taskId: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  await supabase.from("tasks").update({ is_mit: false }).eq("user_id", userId).eq("is_mit", true);
  await supabase.from("tasks").update({ is_mit: true }).eq("id", taskId);

  revalidateTaskViews();
}

export async function clearMostImportantTask(taskId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("tasks").update({ is_mit: false }).eq("id", taskId);
  revalidateTaskViews();
}

export type WeeklyPriorityResult = { status: "ok" } | { status: "limit_reached" } | { status: "error" };

/** Weekly Priorities are capped at 3 per user per week (blueprint §D.3/§0.7). */
export async function addWeeklyPriority(taskId: string): Promise<WeeklyPriorityResult> {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const week = weekStartDate();

  const { count } = await supabase
    .from("weekly_priorities")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("week_start_date", week);

  if ((count ?? 0) >= 3) return { status: "limit_reached" };

  const { error } = await supabase.from("weekly_priorities").insert({
    user_id: userId,
    task_id: taskId,
    week_start_date: week,
  });

  if (error) return { status: "error" };

  revalidateTaskViews();
  return { status: "ok" };
}

export async function removeWeeklyPriority(taskId: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);
  const week = weekStartDate();

  await supabase
    .from("weekly_priorities")
    .delete()
    .eq("user_id", userId)
    .eq("week_start_date", week)
    .eq("task_id", taskId);

  revalidateTaskViews();
}
