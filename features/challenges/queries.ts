import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Challenge } from "./types";

const CHALLENGE_SELECT = `
  id, goal_id, title, daily_action, start_date, status, final_score, reflections, created_at,
  goals ( title ),
  challenge_days ( id, day_number, completed, note )
`;

interface ChallengeRow {
  id: string;
  goal_id: string | null;
  title: string;
  daily_action: string | null;
  start_date: string;
  status: Challenge["status"];
  final_score: number | null;
  reflections: string | null;
  created_at: string;
  goals: { title: string } | null;
  challenge_days: { id: string; day_number: number; completed: boolean; note: string | null }[];
}

function mapChallengeRow(row: ChallengeRow): Challenge {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? null,
    title: row.title,
    dailyAction: row.daily_action,
    startDate: row.start_date,
    status: row.status,
    finalScore: row.final_score,
    reflections: row.reflections,
    createdAt: row.created_at,
    days: (row.challenge_days ?? [])
      .slice()
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => ({ id: d.id, dayNumber: d.day_number, completed: d.completed, note: d.note })),
  };
}

export async function getChallenges(): Promise<Challenge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select(CHALLENGE_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ChallengeRow[]).map(mapChallengeRow);
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("challenges").select(CHALLENGE_SELECT).eq("id", id).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapChallengeRow(data as unknown as ChallengeRow);
}
