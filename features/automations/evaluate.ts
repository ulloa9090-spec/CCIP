import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isTaskOverdueCheckDue, isWeeklyScheduleDue, matchingOverdueTasks } from "./match";
import type { Automation, TaskOverdueCondition, TaskOverdueTriggerConfig, WeeklyScheduleTriggerConfig } from "./types";

interface AutomationRow {
  id: string;
  trigger_type: Automation["triggerType"];
  trigger_config: Record<string, unknown>;
  condition: Record<string, unknown> | null;
  last_run_at: string | null;
}

/**
 * blueprint §M.4 — evaluated at read-time on every authenticated page load
 * (called from `Header`) rather than via a background scheduler: the same
 * "pure read-time query, not a stored trigger" pattern Phase 8 established
 * for Decision due-for-review, generalized here (ADR 0014). Each
 * automation's own `last_run_at` makes this idempotent and cheap — one
 * that already fired today (task_overdue) or this week (weekly_schedule)
 * is skipped before touching any other table.
 */
export async function evaluateAutomations(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("automations")
    .select("id, trigger_type, trigger_config, condition, last_run_at")
    .eq("user_id", user.id)
    .eq("enabled", true);

  const automations = (data ?? []) as AutomationRow[];
  if (automations.length === 0) return;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  for (const automation of automations) {
    if (automation.trigger_type === "task_overdue") {
      if (!isTaskOverdueCheckDue(automation.last_run_at, today)) continue;

      const config = automation.trigger_config as unknown as TaskOverdueTriggerConfig;
      const condition = automation.condition as TaskOverdueCondition | null;

      const { data: taskRows } = await supabase
        .from("tasks")
        .select("id, title, due_date, priority")
        .is("deleted_at", null)
        .neq("status", "done")
        .neq("status", "cancelled")
        .not("due_date", "is", null)
        .lt("due_date", today);

      const tasks = (taskRows ?? []) as { id: string; title: string; due_date: string; priority: string }[];
      const matches = matchingOverdueTasks(
        tasks.map((t) => ({ id: t.id, title: t.title, dueDate: t.due_date, priority: t.priority })),
        config,
        condition,
        today,
      );

      if (matches.length > 0) {
        const title =
          matches.length === 1
            ? `1 task overdue ${config.minDays}+ days`
            : `${matches.length} tasks overdue ${config.minDays}+ days`;
        const body = matches
          .slice(0, 3)
          .map((t) => t.title)
          .join(", ") + (matches.length > 3 ? ", ..." : "");

        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "actionable",
          title,
          body,
          link: "/tasks",
          source: "automation:task_overdue",
        });
      }

      await supabase.from("automations").update({ last_run_at: now.toISOString() }).eq("id", automation.id);
    } else if (automation.trigger_type === "weekly_schedule") {
      const config = automation.trigger_config as unknown as WeeklyScheduleTriggerConfig;
      if (!isWeeklyScheduleDue(config, automation.last_run_at, now)) continue;

      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "actionable",
        title: "Your Weekly Review is ready",
        body: "Take a few minutes to reflect on this week and plan the next one.",
        link: "/reviews",
        source: "automation:weekly_schedule",
      });

      await supabase.from("automations").update({ last_run_at: now.toISOString() }).eq("id", automation.id);
    }
  }
}
