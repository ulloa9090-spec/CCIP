"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { taskOverdueAutomationSchema, weeklyScheduleAutomationSchema } from "@/lib/validation/automations";
import type { ActionResult } from "@/lib/types/action-result";
import type { TaskOverdueCondition, TaskOverdueTriggerConfig, WeeklyScheduleTriggerConfig } from "./types";

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

function revalidateAutomationViews() {
  revalidatePath("/settings");
}

export async function createTaskOverdueAutomation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = taskOverdueAutomationSchema.safeParse({
    name: formData.get("name"),
    minDays: formData.get("minDays"),
    priorities: formData.getAll("priorities"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const triggerConfig: TaskOverdueTriggerConfig = { minDays: parsed.data.minDays };
  const condition: TaskOverdueCondition | null = parsed.data.priorities.length > 0 ? { priorities: parsed.data.priorities } : null;

  const { error } = await supabase.from("automations").insert({
    user_id: userId,
    name: parsed.data.name,
    trigger_type: "task_overdue",
    trigger_config: triggerConfig,
    condition,
    action_type: "create_notification",
  });
  if (error) return { error: "Couldn't create the automation. Try again." };

  revalidateAutomationViews();
  return { message: "Automation created." };
}

export async function createWeeklyScheduleAutomation(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = weeklyScheduleAutomationSchema.safeParse({
    name: formData.get("name"),
    dayOfWeek: formData.get("dayOfWeek"),
    hour: formData.get("hour"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const triggerConfig: WeeklyScheduleTriggerConfig = { dayOfWeek: parsed.data.dayOfWeek, hour: parsed.data.hour };

  const { error } = await supabase.from("automations").insert({
    user_id: userId,
    name: parsed.data.name,
    trigger_type: "weekly_schedule",
    trigger_config: triggerConfig,
    condition: null,
    action_type: "create_notification",
  });
  if (error) return { error: "Couldn't create the automation. Try again." };

  revalidateAutomationViews();
  return { message: "Automation created." };
}

export async function toggleAutomation(id: string, enabled: boolean) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("automations").update({ enabled }).eq("id", id);

  revalidateAutomationViews();
}

export async function deleteAutomation(id: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("automations").delete().eq("id", id);

  revalidateAutomationViews();
}
