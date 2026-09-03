"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSchema, lifeAreaSchema } from "@/lib/validation/goals";
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

export async function createLifeArea(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = lifeAreaSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { count } = await supabase
    .from("life_areas")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  const { error } = await supabase.from("life_areas").insert({
    user_id: userId,
    name: parsed.data.name,
    sort_order: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") return { error: "You already have a Life Area with that name." };
    return { error: "Couldn't create that Life Area. Try again." };
  }

  revalidatePath("/goals");
  return { message: "Life Area created." };
}

/**
 * Creates a Goal, plus an optional metric row when metric fields are
 * filled in (all three: starting/target/current value + a metric name).
 */
export async function createGoal(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = goalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    areaId: formData.get("areaId"),
    quarterCycleId: formData.get("quarterCycleId"),
    timeframe: formData.get("timeframe"),
    targetDate: formData.get("targetDate"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: goal, error } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      area_id: parsed.data.areaId,
      quarter_cycle_id: parsed.data.quarterCycleId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      timeframe: parsed.data.timeframe,
      target_date: parsed.data.targetDate || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error || !goal) return { error: "Couldn't create that goal. Try again." };

  const metricName = String(formData.get("metricName") ?? "").trim();
  if (metricName) {
    await supabase.from("goal_metrics").insert({
      goal_id: goal.id,
      metric_name: metricName,
      starting_value: numericOrNull(formData.get("startingValue")),
      target_value: numericOrNull(formData.get("targetValue")),
      current_value: numericOrNull(formData.get("currentValue")),
      unit: String(formData.get("unit") ?? "").trim() || null,
    });
  }

  revalidatePath("/goals");
  revalidatePath("/plan-90-days");
  revalidatePath("/dashboard");
  redirect(`/goals/${goal.id}`);
}

export async function updateGoal(
  goalId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = goalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    areaId: formData.get("areaId"),
    quarterCycleId: formData.get("quarterCycleId"),
    timeframe: formData.get("timeframe"),
    targetDate: formData.get("targetDate"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("goals")
    .update({
      area_id: parsed.data.areaId,
      quarter_cycle_id: parsed.data.quarterCycleId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      timeframe: parsed.data.timeframe,
      target_date: parsed.data.targetDate || null,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .eq("id", goalId);

  if (error) return { error: "Couldn't save those changes. Try again." };

  const metricName = String(formData.get("metricName") ?? "").trim();
  if (metricName) {
    await supabase.from("goal_metrics").upsert(
      {
        goal_id: goalId,
        metric_name: metricName,
        starting_value: numericOrNull(formData.get("startingValue")),
        target_value: numericOrNull(formData.get("targetValue")),
        current_value: numericOrNull(formData.get("currentValue")),
        unit: String(formData.get("unit") ?? "").trim() || null,
      },
      { onConflict: "goal_id" },
    );
  }

  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
  revalidatePath("/plan-90-days");
  revalidatePath("/dashboard");
  return { message: "Saved." };
}

export async function archiveGoal(goalId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", goalId);

  revalidatePath("/goals");
  revalidatePath("/plan-90-days");
  revalidatePath("/dashboard");
  redirect("/goals");
}

function numericOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const str = String(value).trim();
  if (str === "") return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}
