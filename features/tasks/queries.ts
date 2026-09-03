import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Task, TaskStatus } from "./types";

const TASK_SELECT = `
  id, project_id, goal_id, milestone_id, title, description, status, priority,
  due_date, scheduled_date, is_mit, completed_at, created_at,
  projects ( name )
`;

interface TaskRow {
  id: string;
  project_id: string | null;
  goal_id: string | null;
  milestone_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Task["priority"];
  due_date: string | null;
  scheduled_date: string | null;
  is_mit: boolean;
  completed_at: string | null;
  created_at: string;
  projects: { name: string } | null;
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    goalId: row.goal_id,
    milestoneId: row.milestone_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    scheduledDate: row.scheduled_date,
    isMit: row.is_mit,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export async function getTasks(options?: { projectId?: string }): Promise<Task[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (options?.projectId) query = query.eq("project_id", options.projectId);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapTaskRow(row as unknown as TaskRow));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapTaskRow(data as unknown as TaskRow);
}

/** ISO Monday-start date for the week containing `date` (default: today). */
export function weekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday(0) back to the prior Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export interface WeeklyPriorityRow {
  id: string;
  taskId: string;
  isMostImportantOutcome: boolean;
  task: Task;
}

export async function getWeeklyPriorities(week: string = weekStartDate()): Promise<WeeklyPriorityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_priorities")
    .select(`id, task_id, is_most_important_outcome, tasks ( ${TASK_SELECT} )`)
    .eq("week_start_date", week);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.tasks)
    .map((row) => ({
      id: row.id,
      taskId: row.task_id,
      isMostImportantOutcome: row.is_most_important_outcome,
      task: mapTaskRow(row.tasks as unknown as TaskRow),
    }));
}

export async function getTodayTasks(): Promise<Task[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .is("deleted_at", null)
    .neq("status", "done")
    .neq("status", "cancelled")
    .or(`scheduled_date.eq.${today},status.eq.today`)
    .order("is_mit", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapTaskRow(row as unknown as TaskRow));
}
