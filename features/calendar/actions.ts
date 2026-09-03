"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calendarEventSchema, timeBlockSchema } from "@/lib/validation/calendar";
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

function revalidateCalendarViews() {
  revalidatePath("/calendar");
  revalidatePath("/today");
  revalidatePath("/dashboard");
}

export async function createEvent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = calendarEventSchema.safeParse({
    title: formData.get("title"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("calendar_events").insert({
    user_id: userId,
    title: parsed.data.title,
    start_at: new Date(parsed.data.startAt).toISOString(),
    end_at: new Date(parsed.data.endAt).toISOString(),
    location: parsed.data.location || null,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: "Couldn't create that event. Try again." };

  revalidateCalendarViews();
  return { message: "Event created." };
}

export async function updateEvent(
  eventId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = calendarEventSchema.safeParse({
    title: formData.get("title"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title: parsed.data.title,
      start_at: new Date(parsed.data.startAt).toISOString(),
      end_at: new Date(parsed.data.endAt).toISOString(),
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", eventId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidateCalendarViews();
  return { message: "Saved." };
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("calendar_events").update({ deleted_at: new Date().toISOString() }).eq("id", eventId);

  revalidateCalendarViews();
}

export async function createTimeBlock(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = timeBlockSchema.safeParse({
    title: formData.get("title"),
    taskId: formData.get("taskId"),
    projectId: formData.get("projectId"),
    focusContext: formData.get("focusContext"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("time_blocks").insert({
    user_id: userId,
    title: parsed.data.title,
    task_id: parsed.data.taskId || null,
    project_id: parsed.data.projectId || null,
    focus_context: parsed.data.focusContext || null,
    start_at: new Date(parsed.data.startAt).toISOString(),
    end_at: new Date(parsed.data.endAt).toISOString(),
  });

  if (error) return { error: "Couldn't create that time block. Try again." };

  revalidateCalendarViews();
  return { message: "Time block created." };
}

export async function updateTimeBlock(
  blockId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = timeBlockSchema.safeParse({
    title: formData.get("title"),
    taskId: formData.get("taskId"),
    projectId: formData.get("projectId"),
    focusContext: formData.get("focusContext"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("time_blocks")
    .update({
      title: parsed.data.title,
      task_id: parsed.data.taskId || null,
      project_id: parsed.data.projectId || null,
      focus_context: parsed.data.focusContext || null,
      start_at: new Date(parsed.data.startAt).toISOString(),
      end_at: new Date(parsed.data.endAt).toISOString(),
    })
    .eq("id", blockId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidateCalendarViews();
  return { message: "Saved." };
}

export async function deleteTimeBlock(blockId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("time_blocks").update({ deleted_at: new Date().toISOString() }).eq("id", blockId);

  revalidateCalendarViews();
}
