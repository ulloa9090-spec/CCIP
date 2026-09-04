import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Every user-owned table (blueprint §I.8 — data ownership & export), raw
 * table rows rather than the app's display-shaped types: a backup should
 * preserve exact stored values, not the presentation layer's reshaping. */
const EXPORT_TABLES = [
  "profiles",
  "settings",
  "life_areas",
  "goals",
  "goal_metrics",
  "quarter_cycles",
  "projects",
  "milestones",
  "tasks",
  "tags",
  "task_tags",
  "weekly_priorities",
  "calendar_events",
  "time_blocks",
  "habits",
  "habit_logs",
  "challenges",
  "challenge_days",
  "focus_sessions",
  "decisions",
  "journal_entries",
  "ideas",
  "weekly_reviews",
  "monthly_reviews",
  "ai_threads",
  "ai_messages",
  "ai_insights",
  "notifications",
  "automations",
] as const;

type ExportTable = (typeof EXPORT_TABLES)[number];

export type ExportBundle = Record<ExportTable, Record<string, unknown>[]> & { exportedAt: string };

/** A full per-user data dump — every row RLS ever lets this session see is,
 * by construction, this user's own. Doubles as blueprint §C's "full
 * backup": one JSON file with everything, not a separate mechanism. */
export async function getFullDataExport(): Promise<ExportBundle> {
  const supabase = await createClient();
  const results = await Promise.all(EXPORT_TABLES.map((table) => supabase.from(table).select("*")));

  const bundle = { exportedAt: new Date().toISOString() } as ExportBundle;
  EXPORT_TABLES.forEach((table, i) => {
    bundle[table] = (results[i]!.data ?? []) as Record<string, unknown>[];
  });
  return bundle;
}
