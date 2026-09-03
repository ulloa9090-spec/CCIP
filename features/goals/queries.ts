import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Goal, LifeArea } from "./types";

export async function getLifeAreas(): Promise<LifeArea[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("life_areas")
    .select("id, name, color, icon, sort_order")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
  }));
}

const GOAL_SELECT = `
  id, area_id, quarter_cycle_id, title, description, timeframe, target_date, status, notes, created_at,
  life_areas ( id, name, color, icon, sort_order ),
  goal_metrics ( id, metric_name, starting_value, target_value, current_value, unit )
`;

interface GoalRow {
  id: string;
  area_id: string;
  quarter_cycle_id: string | null;
  title: string;
  description: string | null;
  timeframe: Goal["timeframe"];
  target_date: string | null;
  status: Goal["status"];
  notes: string | null;
  created_at: string;
  life_areas: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
    sort_order: number;
  } | null;
  goal_metrics:
    | {
        id: string;
        metric_name: string;
        starting_value: number | null;
        target_value: number | null;
        current_value: number | null;
        unit: string | null;
      }[]
    | null;
}

function mapGoalRow(row: GoalRow): Goal {
  const metric = row.goal_metrics?.[0];
  return {
    id: row.id,
    areaId: row.area_id,
    quarterCycleId: row.quarter_cycle_id,
    title: row.title,
    description: row.description,
    timeframe: row.timeframe,
    targetDate: row.target_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    area: row.life_areas
      ? {
          id: row.life_areas.id,
          name: row.life_areas.name,
          color: row.life_areas.color,
          icon: row.life_areas.icon,
          sortOrder: row.life_areas.sort_order,
        }
      : null,
    metric: metric
      ? {
          id: metric.id,
          metricName: metric.metric_name,
          startingValue: metric.starting_value,
          targetValue: metric.target_value,
          currentValue: metric.current_value,
          unit: metric.unit,
        }
      : null,
  };
}

export async function getGoals(options?: { quarterCycleId?: string }): Promise<Goal[]> {
  const supabase = await createClient();
  let query = supabase
    .from("goals")
    .select(GOAL_SELECT)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (options?.quarterCycleId) {
    query = query.eq("quarter_cycle_id", options.quarterCycleId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapGoalRow(row as unknown as GoalRow));
}

export async function getGoalById(id: string): Promise<Goal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select(GOAL_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapGoalRow(data as unknown as GoalRow);
}
