import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitLog } from "./types";

/** `profiles.timezone`/`week_start_day` for streak/consistency computation
 * and the weekly grid's day boundaries — never the client's own clock. */
export async function getHabitTimeSettings(): Promise<{ timezone: string; weekStartsOn: 0 | 1 }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data } = await supabase
    .from("profiles")
    .select("timezone, week_start_day")
    .eq("user_id", user.id)
    .single();

  return {
    timezone: data?.timezone ?? "UTC",
    weekStartsOn: data?.week_start_day === 0 ? 0 : 1,
  };
}

const HABIT_SELECT = `
  id, goal_id, project_id, name, description, category, frequency, custom_days,
  target, preferred_time, start_date, is_active, created_at, updated_at,
  goals ( title ), projects ( name )
`;

interface HabitRow {
  id: string;
  goal_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  frequency: Habit["frequency"];
  custom_days: number[] | null;
  target: number;
  preferred_time: string | null;
  start_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  goals: { title: string } | null;
  projects: { name: string } | null;
}

function mapHabitRow(row: HabitRow): Habit {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? null,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    name: row.name,
    description: row.description,
    category: row.category,
    frequency: row.frequency,
    customDays: row.custom_days,
    target: row.target,
    preferredTime: row.preferred_time,
    startDate: row.start_date,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getHabits({ activeOnly = true }: { activeOnly?: boolean } = {}): Promise<Habit[]> {
  const supabase = await createClient();
  let query = supabase
    .from("habits")
    .select(HABIT_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapHabitRow(row as unknown as HabitRow));
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapHabitRow(data as unknown as HabitRow);
}

/** Logs for the given habits between `start` and `end` (inclusive, "yyyy-mm-dd"). */
export async function getHabitLogs(habitIds: string[], start: string, end: string): Promise<HabitLog[]> {
  if (habitIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habit_logs")
    .select("id, habit_id, log_date, completed, note")
    .in("habit_id", habitIds)
    .gte("log_date", start)
    .lte("log_date", end);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    habitId: row.habit_id,
    logDate: row.log_date,
    completed: row.completed,
    note: row.note,
  }));
}
