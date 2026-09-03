import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "./types";

const PROJECT_SELECT = `
  id, goal_id, name, description, status, is_primary_active, start_date, deadline,
  progress_override, notes, created_at,
  goals ( title ),
  milestones ( id, title, target_date, status, sort_order )
`;

interface ProjectRow {
  id: string;
  goal_id: string | null;
  name: string;
  description: string | null;
  status: Project["status"];
  is_primary_active: boolean;
  start_date: string | null;
  deadline: string | null;
  progress_override: number | null;
  notes: string | null;
  created_at: string;
  goals: { title: string } | null;
  milestones: {
    id: string;
    title: string;
    target_date: string | null;
    status: Project["milestones"][number]["status"];
    sort_order: number;
  }[];
}

async function taskStatsByProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectIds: string[],
): Promise<Record<string, { total: number; done: number }>> {
  if (projectIds.length === 0) return {};

  const { data } = await supabase
    .from("tasks")
    .select("project_id, status")
    .in("project_id", projectIds)
    .is("deleted_at", null);

  const stats: Record<string, { total: number; done: number }> = {};
  for (const row of data ?? []) {
    const pid = row.project_id as string;
    stats[pid] ??= { total: 0, done: 0 };
    stats[pid].total += 1;
    if (row.status === "done") stats[pid].done += 1;
  }
  return stats;
}

function mapProjectRow(row: ProjectRow, taskStats: { total: number; done: number }): Project {
  return {
    id: row.id,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? null,
    name: row.name,
    description: row.description,
    status: row.status,
    isPrimaryActive: row.is_primary_active,
    startDate: row.start_date,
    deadline: row.deadline,
    progressOverride: row.progress_override,
    notes: row.notes,
    createdAt: row.created_at,
    milestones: (row.milestones ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({
        id: m.id,
        title: m.title,
        targetDate: m.target_date,
        status: m.status,
        sortOrder: m.sort_order,
      })),
    taskStats,
  };
}

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as ProjectRow[];
  const statsByProject = await taskStatsByProject(
    supabase,
    rows.map((r) => r.id),
  );

  return rows.map((row) => mapProjectRow(row, statsByProject[row.id] ?? { total: 0, done: 0 }));
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as ProjectRow;
  const stats = await taskStatsByProject(supabase, [row.id]);
  return mapProjectRow(row, stats[row.id] ?? { total: 0, done: 0 });
}

export async function getActiveProject(): Promise<Project | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("is_primary_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as ProjectRow;
  const stats = await taskStatsByProject(supabase, [row.id]);
  return mapProjectRow(row, stats[row.id] ?? { total: 0, done: 0 });
}
