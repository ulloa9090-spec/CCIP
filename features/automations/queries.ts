import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Automation } from "./types";

const SELECT = "id, name, trigger_type, trigger_config, condition, action_type, enabled, last_run_at, created_at";

interface AutomationRow {
  id: string;
  name: string;
  trigger_type: Automation["triggerType"];
  trigger_config: Automation["triggerConfig"];
  condition: Automation["condition"];
  action_type: Automation["actionType"];
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

function mapRow(row: AutomationRow): Automation {
  return {
    id: row.id,
    name: row.name,
    triggerType: row.trigger_type,
    triggerConfig: row.trigger_config,
    condition: row.condition,
    actionType: row.action_type,
    enabled: row.enabled,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
  };
}

export async function getAutomations(): Promise<Automation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("automations").select(SELECT).order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as AutomationRow[]).map(mapRow);
}
