import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Idea, IdeaStatus } from "./types";

const IDEA_SELECT = `
  id, title, description, category, status, impact, effort, urgency, notes,
  review_date, promoted_project_id, created_at
`;

interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: IdeaStatus;
  impact: number | null;
  effort: number | null;
  urgency: number | null;
  notes: string | null;
  review_date: string | null;
  promoted_project_id: string | null;
  created_at: string;
}

function mapRow(row: IdeaRow): Idea {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    impact: row.impact,
    effort: row.effort,
    urgency: row.urgency,
    notes: row.notes,
    reviewDate: row.review_date,
    promotedProjectId: row.promoted_project_id,
    createdAt: row.created_at,
  };
}

export async function getIdeas(): Promise<Idea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .select(IDEA_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as IdeaRow[]).map(mapRow);
}

export async function getIdeaById(id: string): Promise<Idea | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .select(IDEA_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRow(data as unknown as IdeaRow);
}
