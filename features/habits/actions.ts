"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { habitSchema } from "@/lib/validation/habits";
import type { ActionResult } from "@/lib/types/action-result";
import { todayInTimezone } from "./progress";
import { getHabitTimeSettings } from "./queries";

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

function revalidateHabitViews() {
  revalidatePath("/habits");
  revalidatePath("/today");
  revalidatePath("/dashboard");
}

function parseHabitForm(formData: FormData) {
  return habitSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    frequency: formData.get("frequency") || "daily",
    customDays: formData.getAll("customDays"),
    target: formData.get("target") || undefined,
    goalId: formData.get("goalId"),
    projectId: formData.get("projectId"),
    startDate: formData.get("startDate"),
  });
}

export async function createHabit(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = parseHabitForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("habits").insert({
    user_id: userId,
    goal_id: parsed.data.goalId || null,
    project_id: parsed.data.projectId || null,
    name: parsed.data.name,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
    frequency: parsed.data.frequency,
    custom_days: parsed.data.frequency === "custom" ? (parsed.data.customDays ?? []) : null,
    target: parsed.data.target ?? 1,
    start_date: parsed.data.startDate || new Date().toISOString().slice(0, 10),
  });

  if (error) return { error: "Couldn't create that habit. Try again." };

  revalidateHabitViews();
  return { message: "Habit created." };
}

export async function updateHabit(
  habitId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseHabitForm(formData);
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("habits")
    .update({
      goal_id: parsed.data.goalId || null,
      project_id: parsed.data.projectId || null,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      frequency: parsed.data.frequency,
      custom_days: parsed.data.frequency === "custom" ? (parsed.data.customDays ?? []) : null,
      target: parsed.data.target ?? 1,
      start_date: parsed.data.startDate || undefined,
    })
    .eq("id", habitId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  revalidateHabitViews();
  return { message: "Saved." };
}

export async function archiveHabit(habitId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("habits").update({ deleted_at: new Date().toISOString() }).eq("id", habitId);

  revalidateHabitViews();
}

export async function toggleHabitActive(habitId: string, isActive: boolean) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("habits").update({ is_active: isActive }).eq("id", habitId);

  revalidateHabitViews();
}

export type ToggleHabitLogResult = { status: "ok" } | { status: "future_date" } | { status: "error" };

/** Marks (or unmarks) a habit for a given day. Cannot mark a future date
 * (blueprint Flow 11) — checked against "today" in the user's own timezone,
 * never the browser's clock. */
export async function toggleHabitLog(
  habitId: string,
  logDate: string,
  completed: boolean,
): Promise<ToggleHabitLogResult> {
  const supabase = await createClient();
  await requireUserId(supabase);

  const { timezone } = await getHabitTimeSettings();
  const today = todayInTimezone(timezone);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (logDate > todayStr) return { status: "future_date" };

  if (completed) {
    const { error } = await supabase
      .from("habit_logs")
      .upsert({ habit_id: habitId, log_date: logDate, completed: true }, { onConflict: "habit_id,log_date" });
    if (error) return { status: "error" };
  } else {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("habit_id", habitId)
      .eq("log_date", logDate);
    if (error) return { status: "error" };
  }

  revalidateHabitViews();
  return { status: "ok" };
}
