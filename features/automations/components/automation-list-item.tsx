"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteAutomation, toggleAutomation } from "@/features/automations/actions";
import { WEEKDAY_OPTIONS } from "@/lib/validation/automations";
import type { Automation, TaskOverdueCondition, TaskOverdueTriggerConfig, WeeklyScheduleTriggerConfig } from "@/features/automations/types";

function describeTrigger(automation: Automation): string {
  if (automation.triggerType === "task_overdue") {
    const config = automation.triggerConfig as TaskOverdueTriggerConfig;
    const condition = automation.condition as TaskOverdueCondition | null;
    const priorities = condition?.priorities;
    const scope = priorities && priorities.length > 0 ? ` (${priorities.join(", ")})` : "";
    return `Notify when a task is ${config.minDays}+ days overdue${scope}`;
  }
  const config = automation.triggerConfig as WeeklyScheduleTriggerConfig;
  const day = WEEKDAY_OPTIONS.find((d) => d.value === config.dayOfWeek)?.label ?? "?";
  return `Notify every ${day} at ${String(config.hour).padStart(2, "0")}:00 UTC`;
}

export function AutomationListItem({ automation }: { automation: Automation }) {
  const [enabled, setEnabled] = useState(automation.enabled);
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function handleToggle() {
    setEnabled((prev) => !prev);
    toggleAutomation(automation.id, !enabled);
  }

  function handleDelete() {
    setDeleted(true);
    deleteAutomation(automation.id);
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary">{automation.name}</p>
            <Badge variant={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
          </div>
          <p className="text-xs text-text-secondary">{describeTrigger(automation)}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Disable automation" : "Enable automation"}
            onClick={handleToggle}
            className="relative h-5 w-9 shrink-0 rounded-full bg-surface transition-colors data-[on=true]:bg-accent"
            data-on={enabled}
          >
            <span
              className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-surface-raised shadow transition-transform"
              style={{ transform: enabled ? "translateX(1rem)" : "translateX(0)" }}
            />
          </button>
          <button
            type="button"
            aria-label={`Delete ${automation.name}`}
            onClick={handleDelete}
            className="text-text-secondary hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
