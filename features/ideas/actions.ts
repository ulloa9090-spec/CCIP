"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ideaSchema, IDEA_STATUSES, promoteIdeaSchema } from "@/lib/validation/ideas";
import type { ActionResult } from "@/lib/types/action-result";
import type { IdeaStatus } from "./types";

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

function revalidateIdeaViews() {
  revalidatePath("/ideas");
  revalidatePath("/dashboard");
}

function parseIdeaForm(formData: FormData) {
  return ideaSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    status: formData.get("status") || undefined,
    impact: formData.get("impact") || undefined,
    effort: formData.get("effort") || undefined,
    urgency: formData.get("urgency") || undefined,
    notes: formData.get("notes"),
    reviewDate: formData.get("reviewDate"),
  });
}

export async function createIdea(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseIdeaForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("ideas").insert({
    user_id: userId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
    impact: parsed.data.impact ?? null,
    effort: parsed.data.effort ?? null,
    urgency: parsed.data.urgency ?? null,
    notes: parsed.data.notes || null,
    review_date: parsed.data.reviewDate || null,
  });

  if (error) return { error: "Couldn't capture that idea. Try again." };

  revalidateIdeaViews();
  return { message: "Idea captured." };
}

export async function updateIdea(ideaId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseIdeaForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("ideas")
    .update({
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      impact: parsed.data.impact ?? null,
      effort: parsed.data.effort ?? null,
      urgency: parsed.data.urgency ?? null,
      notes: parsed.data.notes || null,
      review_date: parsed.data.reviewDate || null,
    })
    .eq("id", ideaId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidateIdeaViews();
  return { message: "Saved." };
}

const VALID_STATUSES = new Set<string>(IDEA_STATUSES);

/** Used by the Ideas Kanban board on drop. */
export async function updateIdeaStatus(ideaId: string, status: IdeaStatus) {
  if (!VALID_STATUSES.has(status)) return;

  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("ideas").update({ status }).eq("id", ideaId);

  revalidateIdeaViews();
}

/** Flow 14: promote an idea into a real project. Mapped fields carry over;
 * the new project starts at the chosen status, not necessarily Active — if
 * the user wants it Active, that's one click away on the Project page,
 * which already owns the Active Project conflict-resolution flow. */
export async function promoteIdea(ideaId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = promoteIdeaSchema.safeParse({ projectStatus: formData.get("projectStatus") });
  if (!parsed.success) return { error: "Choose a valid project status." };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: idea } = await supabase.from("ideas").select("title, description").eq("id", ideaId).single();
  if (!idea) return { error: "Idea not found." };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: idea.title,
      description: idea.description,
      status: parsed.data.projectStatus,
    })
    .select("id")
    .single();

  if (projectError || !project) return { error: "Couldn't create the project. Try again." };

  const { error: ideaError } = await supabase
    .from("ideas")
    .update({ status: "promoted", promoted_project_id: project.id })
    .eq("id", ideaId);

  if (ideaError) return { error: "Project created, but couldn't update the idea. Check /projects." };

  revalidateIdeaViews();
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
