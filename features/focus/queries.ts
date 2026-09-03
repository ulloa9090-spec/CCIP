import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FocusSession } from "./types";

const FOCUS_SELECT = `
  id, task_id, project_id, context, planned_minutes, actual_minutes, started_at, ended_at, note,
  tasks ( title ), projects ( name )
`;

interface FocusSessionRow {
  id: string;
  task_id: string | null;
  project_id: string | null;
  context: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  started_at: string;
  ended_at: string | null;
  note: string | null;
  tasks: { title: string } | null;
  projects: { name: string } | null;
}

function mapRow(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.tasks?.title ?? null,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    context: row.context,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    note: row.note,
  };
}

export async function getTodaySessions(): Promise<FocusSession[]> {
  const supabase = await createClient();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const { data, error } = await supabase
    .from("focus_sessions")
    .select(FOCUS_SELECT)
    .gte("started_at", start)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as FocusSessionRow[]).map(mapRow);
}
