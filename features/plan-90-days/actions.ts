"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quarterCycleSchema } from "@/lib/validation/goals";
import type { ActionResult } from "@/lib/types/action-result";
import type { QuarterCycleMilestone } from "@/features/goals/types";

function flattenZodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createQuarterCycle(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = quarterCycleSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    expectedOutcome: formData.get("expectedOutcome"),
    primaryIndicator: formData.get("primaryIndicator"),
    strategy: formData.get("strategy"),
    risks: formData.get("risks"),
    milestone1: formData.get("milestone1"),
    milestone2: formData.get("milestone2"),
    milestone3: formData.get("milestone3"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const keyMilestones: QuarterCycleMilestone[] = [
    parsed.data.milestone1,
    parsed.data.milestone2,
    parsed.data.milestone3,
  ]
    .filter((title): title is string => Boolean(title && title.trim()))
    .map((title) => ({ title: title.trim(), targetDate: null, done: false }));

  const { error } = await supabase.from("quarter_cycles").insert({
    user_id: user.id,
    name: parsed.data.name,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    expected_outcome: parsed.data.expectedOutcome || null,
    primary_indicator: parsed.data.primaryIndicator || null,
    strategy: parsed.data.strategy || null,
    risks: parsed.data.risks || null,
    key_milestones: keyMilestones,
  });

  if (error) return { error: "Couldn't create that cycle. Try again." };

  revalidatePath("/plan-90-days");
  revalidatePath("/dashboard");
  return { message: "90-Day Cycle created." };
}

export async function toggleCycleMilestone(cycleId: string, index: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: cycle } = await supabase
    .from("quarter_cycles")
    .select("key_milestones")
    .eq("id", cycleId)
    .single();

  if (!cycle) return;

  const milestones = (cycle.key_milestones as QuarterCycleMilestone[]) ?? [];
  if (!milestones[index]) return;

  milestones[index] = { ...milestones[index], done: !milestones[index].done };

  await supabase.from("quarter_cycles").update({ key_milestones: milestones }).eq("id", cycleId);

  revalidatePath("/plan-90-days");
  revalidatePath("/dashboard");
}
