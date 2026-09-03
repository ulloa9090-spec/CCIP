"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { challengeReflectionSchema, challengeSchema } from "@/lib/validation/challenges";
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

function revalidateChallengeViews(challengeId?: string) {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  if (challengeId) revalidatePath(`/habits/challenges/${challengeId}`);
}

/** A challenge always runs exactly 21 days (blueprint §I.9's check constraint) — seeded at creation. */
export async function createChallenge(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = challengeSchema.safeParse({
    title: formData.get("title"),
    dailyAction: formData.get("dailyAction"),
    startDate: formData.get("startDate"),
    goalId: formData.get("goalId"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: challenge, error } = await supabase
    .from("challenges")
    .insert({
      user_id: userId,
      goal_id: parsed.data.goalId || null,
      title: parsed.data.title,
      daily_action: parsed.data.dailyAction || null,
      start_date: parsed.data.startDate || new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (error || !challenge) return { error: "Couldn't create that challenge. Try again." };

  const days = Array.from({ length: 21 }, (_, i) => ({ challenge_id: challenge.id, day_number: i + 1 }));
  const { error: daysError } = await supabase.from("challenge_days").insert(days);
  if (daysError) return { error: "Couldn't set up the 21-day tracker. Try again." };

  revalidateChallengeViews();
  redirect(`/habits/challenges/${challenge.id}`);
}

export async function toggleChallengeDay(challengeId: string, dayId: string, completed: boolean) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("challenge_days").update({ completed }).eq("id", dayId);

  revalidateChallengeViews(challengeId);
}

export async function completeChallenge(
  challengeId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = challengeReflectionSchema.safeParse({
    finalScore: formData.get("finalScore") || undefined,
    reflections: formData.get("reflections"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const { error } = await supabase
    .from("challenges")
    .update({
      status: "completed",
      final_score: parsed.data.finalScore ?? null,
      reflections: parsed.data.reflections || null,
    })
    .eq("id", challengeId);

  if (error) return { error: "Couldn't complete that challenge. Try again." };

  revalidateChallengeViews(challengeId);
  return { message: "Challenge completed." };
}

export async function abandonChallenge(challengeId: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("challenges").update({ status: "abandoned" }).eq("id", challengeId);

  revalidateChallengeViews(challengeId);
}
