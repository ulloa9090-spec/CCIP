import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyReview, WeeklyReview } from "./types";

const WEEKLY_SELECT = `
  id, week_start_date, status, auto_summary, reflection_completed, reflection_missed,
  reflection_why, reflection_progress, reflection_time_wasted, reflection_stop_doing,
  reflection_learned, next_week_mio_task_id, execution_score, created_at
`;

interface WeeklyReviewRow {
  id: string;
  week_start_date: string;
  status: WeeklyReview["status"];
  auto_summary: WeeklyReview["autoSummary"];
  reflection_completed: string | null;
  reflection_missed: string | null;
  reflection_why: string | null;
  reflection_progress: string | null;
  reflection_time_wasted: string | null;
  reflection_stop_doing: string | null;
  reflection_learned: string | null;
  next_week_mio_task_id: string | null;
  execution_score: number | null;
  created_at: string;
}

function mapWeeklyRow(row: WeeklyReviewRow): WeeklyReview {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    status: row.status,
    autoSummary: row.auto_summary,
    reflectionCompleted: row.reflection_completed,
    reflectionMissed: row.reflection_missed,
    reflectionWhy: row.reflection_why,
    reflectionProgress: row.reflection_progress,
    reflectionTimeWasted: row.reflection_time_wasted,
    reflectionStopDoing: row.reflection_stop_doing,
    reflectionLearned: row.reflection_learned,
    nextWeekMioTaskId: row.next_week_mio_task_id,
    executionScore: row.execution_score,
    createdAt: row.created_at,
  };
}

export async function getWeeklyReviews(): Promise<WeeklyReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select(WEEKLY_SELECT)
    .order("week_start_date", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as WeeklyReviewRow[]).map(mapWeeklyRow);
}

export async function getWeeklyReviewByWeek(weekStartDate: string): Promise<WeeklyReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_reviews")
    .select(WEEKLY_SELECT)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapWeeklyRow(data as unknown as WeeklyReviewRow);
}

const MONTHLY_SELECT = `
  id, month, status, auto_summary, wins, failures, lessons, next_month_priorities, created_at
`;

interface MonthlyReviewRow {
  id: string;
  month: string;
  status: MonthlyReview["status"];
  auto_summary: MonthlyReview["autoSummary"];
  wins: string | null;
  failures: string | null;
  lessons: string | null;
  next_month_priorities: string | null;
  created_at: string;
}

function mapMonthlyRow(row: MonthlyReviewRow): MonthlyReview {
  return {
    id: row.id,
    month: row.month,
    status: row.status,
    autoSummary: row.auto_summary,
    wins: row.wins,
    failures: row.failures,
    lessons: row.lessons,
    nextMonthPriorities: row.next_month_priorities,
    createdAt: row.created_at,
  };
}

export async function getMonthlyReviews(): Promise<MonthlyReview[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("monthly_reviews").select(MONTHLY_SELECT).order("month", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as MonthlyReviewRow[]).map(mapMonthlyRow);
}

export async function getMonthlyReviewByMonth(month: string): Promise<MonthlyReview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("monthly_reviews").select(MONTHLY_SELECT).eq("month", month).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapMonthlyRow(data as unknown as MonthlyReviewRow);
}
