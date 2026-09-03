"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { milestoneSchema, projectSchema } from "@/lib/validation/projects";
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

export async function createProject(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    goalId: formData.get("goalId"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    deadline: formData.get("deadline"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      goal_id: parsed.data.goalId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: parsed.data.status,
      start_date: parsed.data.startDate || null,
      deadline: parsed.data.deadline || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !project) return { error: "Couldn't create that project. Try again." };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  projectId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    goalId: formData.get("goalId"),
    status: formData.get("status"),
    startDate: formData.get("startDate"),
    deadline: formData.get("deadline"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("projects")
    .update({
      goal_id: parsed.data.goalId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      status: parsed.data.status,
      start_date: parsed.data.startDate || null,
      deadline: parsed.data.deadline || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", projectId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { message: "Saved." };
}

export async function archiveProject(projectId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString(), is_primary_active: false })
    .eq("id", projectId);

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect("/projects");
}

export async function addMilestone(
  projectId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse({
    title: formData.get("title"),
    targetDate: formData.get("targetDate"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { count } = await supabase
    .from("milestones")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase.from("milestones").insert({
    project_id: projectId,
    title: parsed.data.title,
    target_date: parsed.data.targetDate || null,
    sort_order: count ?? 0,
  });

  if (error) return { error: "Couldn't add that milestone. Try again." };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { message: "Milestone added." };
}

export async function toggleMilestoneStatus(projectId: string, milestoneId: string, done: boolean) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase
    .from("milestones")
    .update({ status: done ? "done" : "pending" })
    .eq("id", milestoneId);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Active Project rule (blueprint §D.2 / §0.6). "Send to Parking Lot" isn't
// available yet — Ideas don't exist until Phase 8 — so the conflict flow
// offers Replace / Make Secondary / Cancel only.
// ---------------------------------------------------------------------------

export type SetPrimaryResult =
  | { status: "ok" }
  | { status: "conflict"; currentId: string; currentName: string }
  | { status: "error"; message: string };

export async function attemptSetPrimary(projectId: string): Promise<SetPrimaryResult> {
  const supabase = await createClient();
  await requireUserId(supabase);

  const { data: current } = await supabase
    .from("projects")
    .select("id, name")
    .eq("is_primary_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (current && current.id !== projectId) {
    return { status: "conflict", currentId: current.id, currentName: current.name };
  }

  const { error } = await supabase
    .from("projects")
    .update({ is_primary_active: true, status: "active" })
    .eq("id", projectId);

  if (error) return { status: "error", message: "Couldn't set this project as active." };

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { status: "ok" };
}

export async function resolveReplacePrimary(newProjectId: string, oldProjectId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("projects").update({ is_primary_active: false, status: "secondary" }).eq("id", oldProjectId);
  await supabase.from("projects").update({ is_primary_active: true, status: "active" }).eq("id", newProjectId);

  revalidatePath("/projects");
  revalidatePath("/dashboard");
}

export async function resolveMakeSecondary(projectId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("projects").update({ status: "secondary" }).eq("id", projectId);

  revalidatePath("/projects");
  revalidatePath("/dashboard");
}
