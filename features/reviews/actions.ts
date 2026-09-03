"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { monthlyReflectionSchema, weeklyReflectionSchema } from "@/lib/validation/reviews";
import type { ActionResult } from "@/lib/types/action-result";
import { computeMonthlySummary, computeWeeklyMetrics } from "./aggregate";
import { computeExecutionScore } from "./execution-score";
import { toDateStr } from "@/features/habits/progress";

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

function revalidateReviewViews() {
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
}

/** Starts (or resumes) this week's review, then hands off to the session
 * screen. auto_summary is (re)computed here so the session page always
 * opens on a fresh snapshot, per blueprint Flow 12. */
export async function startOrGetWeeklyReview(weekStartDate: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: existing } = await supabase
    .from("weekly_reviews")
    .select("id, status")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (!existing) {
    const metrics = await computeWeeklyMetrics(new Date(`${weekStartDate}T00:00:00`));
    await supabase.from("weekly_reviews").insert({
      user_id: userId,
      week_start_date: weekStartDate,
      auto_summary: metrics,
    });
  } else if (existing.status === "in_progress") {
    const metrics = await computeWeeklyMetrics(new Date(`${weekStartDate}T00:00:00`));
    await supabase.from("weekly_reviews").update({ auto_summary: metrics }).eq("id", existing.id);
  }

  revalidateReviewViews();
  redirect(`/reviews/weekly/${weekStartDate}`);
}

export async function saveWeeklyReviewDraft(
  weekStartDate: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = weeklyReflectionSchema.safeParse({
    reflectionCompleted: formData.get("reflectionCompleted"),
    reflectionMissed: formData.get("reflectionMissed"),
    reflectionWhy: formData.get("reflectionWhy"),
    reflectionProgress: formData.get("reflectionProgress"),
    reflectionTimeWasted: formData.get("reflectionTimeWasted"),
    reflectionStopDoing: formData.get("reflectionStopDoing"),
    reflectionLearned: formData.get("reflectionLearned"),
    nextWeekMioTaskId: formData.get("nextWeekMioTaskId"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const metrics = await computeWeeklyMetrics(new Date(`${weekStartDate}T00:00:00`));

  const { error } = await supabase
    .from("weekly_reviews")
    .update({
      auto_summary: metrics,
      reflection_completed: parsed.data.reflectionCompleted || null,
      reflection_missed: parsed.data.reflectionMissed || null,
      reflection_why: parsed.data.reflectionWhy || null,
      reflection_progress: parsed.data.reflectionProgress || null,
      reflection_time_wasted: parsed.data.reflectionTimeWasted || null,
      reflection_stop_doing: parsed.data.reflectionStopDoing || null,
      reflection_learned: parsed.data.reflectionLearned || null,
      next_week_mio_task_id: parsed.data.nextWeekMioTaskId || null,
    })
    .eq("week_start_date", weekStartDate);

  if (error) return { error: "Couldn't save your draft. Try again." };

  revalidateReviewViews();
  return { message: "Draft saved." };
}

/** Locks the week: final auto_summary snapshot + execution_score computed
 * once here and never recomputed again (blueprint §L.1 — a score is
 * finalized at that week's own review, not left to silently drift if data
 * is edited afterward). If a next-week MIO was chosen, pre-populates it as
 * next week's Most Important Outcome (blueprint Flow 12). */
export async function completeWeeklyReview(
  weekStartDate: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = weeklyReflectionSchema.safeParse({
    reflectionCompleted: formData.get("reflectionCompleted"),
    reflectionMissed: formData.get("reflectionMissed"),
    reflectionWhy: formData.get("reflectionWhy"),
    reflectionProgress: formData.get("reflectionProgress"),
    reflectionTimeWasted: formData.get("reflectionTimeWasted"),
    reflectionStopDoing: formData.get("reflectionStopDoing"),
    reflectionLearned: formData.get("reflectionLearned"),
    nextWeekMioTaskId: formData.get("nextWeekMioTaskId"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const metrics = await computeWeeklyMetrics(new Date(`${weekStartDate}T00:00:00`));
  const { score } = computeExecutionScore(metrics);

  const { error } = await supabase
    .from("weekly_reviews")
    .update({
      status: "completed",
      auto_summary: metrics,
      execution_score: score,
      reflection_completed: parsed.data.reflectionCompleted || null,
      reflection_missed: parsed.data.reflectionMissed || null,
      reflection_why: parsed.data.reflectionWhy || null,
      reflection_progress: parsed.data.reflectionProgress || null,
      reflection_time_wasted: parsed.data.reflectionTimeWasted || null,
      reflection_stop_doing: parsed.data.reflectionStopDoing || null,
      reflection_learned: parsed.data.reflectionLearned || null,
      next_week_mio_task_id: parsed.data.nextWeekMioTaskId || null,
    })
    .eq("week_start_date", weekStartDate);

  if (error) return { error: "Couldn't complete the review. Try again." };

  if (parsed.data.nextWeekMioTaskId) {
    const nextWeekStart = toDateStr(addDays(new Date(`${weekStartDate}T00:00:00`), 7));
    await supabase.from("weekly_priorities").upsert(
      {
        user_id: userId,
        task_id: parsed.data.nextWeekMioTaskId,
        week_start_date: nextWeekStart,
        is_most_important_outcome: true,
      },
      { onConflict: "user_id,week_start_date,task_id" },
    );
  }

  revalidateReviewViews();
  return { message: "Review completed." };
}

export async function startOrGetMonthlyReview(month: string) {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { data: existing } = await supabase
    .from("monthly_reviews")
    .select("id, status")
    .eq("month", month)
    .maybeSingle();

  if (!existing) {
    const summary = await computeMonthlySummary(new Date(`${month}T00:00:00`));
    await supabase.from("monthly_reviews").insert({ user_id: userId, month, auto_summary: summary });
  } else if (existing.status === "in_progress") {
    const summary = await computeMonthlySummary(new Date(`${month}T00:00:00`));
    await supabase.from("monthly_reviews").update({ auto_summary: summary }).eq("id", existing.id);
  }

  revalidateReviewViews();
  redirect(`/reviews/monthly/${month}`);
}

export async function saveMonthlyReviewDraft(
  month: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = monthlyReflectionSchema.safeParse({
    wins: formData.get("wins"),
    failures: formData.get("failures"),
    lessons: formData.get("lessons"),
    nextMonthPriorities: formData.get("nextMonthPriorities"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const summary = await computeMonthlySummary(new Date(`${month}T00:00:00`));

  const { error } = await supabase
    .from("monthly_reviews")
    .update({
      auto_summary: summary,
      wins: parsed.data.wins || null,
      failures: parsed.data.failures || null,
      lessons: parsed.data.lessons || null,
      next_month_priorities: parsed.data.nextMonthPriorities || null,
    })
    .eq("month", month);

  if (error) return { error: "Couldn't save your draft. Try again." };

  revalidateReviewViews();
  return { message: "Draft saved." };
}

export async function completeMonthlyReview(
  month: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = monthlyReflectionSchema.safeParse({
    wins: formData.get("wins"),
    failures: formData.get("failures"),
    lessons: formData.get("lessons"),
    nextMonthPriorities: formData.get("nextMonthPriorities"),
  });
  if (!parsed.success) return { fieldErrors: flattenZodErrors(parsed.error) };

  const supabase = await createClient();
  await requireUserId(supabase);

  const summary = await computeMonthlySummary(new Date(`${month}T00:00:00`));

  const { error } = await supabase
    .from("monthly_reviews")
    .update({
      status: "completed",
      auto_summary: summary,
      wins: parsed.data.wins || null,
      failures: parsed.data.failures || null,
      lessons: parsed.data.lessons || null,
      next_month_priorities: parsed.data.nextMonthPriorities || null,
    })
    .eq("month", month);

  if (error) return { error: "Couldn't complete the review. Try again." };

  revalidateReviewViews();
  return { message: "Review completed." };
}
