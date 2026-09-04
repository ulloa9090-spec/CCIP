import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { JournalCategory, JournalEntry } from "./types";

const JOURNAL_SELECT = `
  id, category, body, goal_id, project_id, task_id, decision_id, created_at,
  goals ( title ), projects ( name ), tasks ( title ), decisions ( title )
`;

interface JournalEntryRow {
  id: string;
  category: JournalCategory;
  body: string;
  goal_id: string | null;
  project_id: string | null;
  task_id: string | null;
  decision_id: string | null;
  created_at: string;
  goals: { title: string } | null;
  projects: { name: string } | null;
  tasks: { title: string } | null;
  decisions: { title: string } | null;
}

function mapRow(row: JournalEntryRow): JournalEntry {
  return {
    id: row.id,
    category: row.category,
    body: row.body,
    goalId: row.goal_id,
    goalTitle: row.goals?.title ?? null,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    taskId: row.task_id,
    taskTitle: row.tasks?.title ?? null,
    decisionId: row.decision_id,
    decisionTitle: row.decisions?.title ?? null,
    createdAt: row.created_at,
  };
}

/** blueprint §O.10 — Journal is the one flat, unbounded-growth list in the
 * app (Tasks/Ideas are Kanban boards, capped per-column instead — see
 * ADR 0016), so it's the one that needs real pagination. */
export const JOURNAL_PAGE_SIZE = 30;

export interface JournalEntriesPage {
  entries: JournalEntry[];
  hasMore: boolean;
}

export async function getJournalEntries({
  category,
  page = 1,
}: { category?: JournalCategory; page?: number } = {}): Promise<JournalEntriesPage> {
  const supabase = await createClient();
  const from = (page - 1) * JOURNAL_PAGE_SIZE;
  const to = from + JOURNAL_PAGE_SIZE; // one extra row, to detect hasMore without a separate count query

  let query = supabase.from("journal_entries").select(JOURNAL_SELECT).order("created_at", { ascending: false }).range(from, to);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as JournalEntryRow[];
  return { entries: rows.slice(0, JOURNAL_PAGE_SIZE).map(mapRow), hasMore: rows.length > JOURNAL_PAGE_SIZE };
}
