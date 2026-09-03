import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { QuarterCycle, QuarterCycleMilestone } from "@/features/goals/types";

interface CycleRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  expected_outcome: string | null;
  primary_indicator: string | null;
  strategy: string | null;
  risks: string | null;
  key_milestones: unknown;
}

function mapCycleRow(row: CycleRow): QuarterCycle {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    expectedOutcome: row.expected_outcome,
    primaryIndicator: row.primary_indicator,
    strategy: row.strategy,
    risks: row.risks,
    keyMilestones: Array.isArray(row.key_milestones)
      ? (row.key_milestones as QuarterCycleMilestone[])
      : [],
  };
}

/** The cycle whose date range covers today, if any. */
export async function getCurrentCycle(): Promise<QuarterCycle | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("quarter_cycles")
    .select(
      "id, name, start_date, end_date, expected_outcome, primary_indicator, strategy, risks, key_milestones",
    )
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapCycleRow(data as CycleRow);
}

export async function getCycles(): Promise<QuarterCycle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quarter_cycles")
    .select(
      "id, name, start_date, end_date, expected_outcome, primary_indicator, strategy, risks, key_milestones",
    )
    .order("start_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapCycleRow(row as CycleRow));
}
