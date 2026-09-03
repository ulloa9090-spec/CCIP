export type AutomationTriggerType = "task_overdue" | "weekly_schedule";
export type AutomationActionType = "create_notification";

export interface TaskOverdueTriggerConfig {
  minDays: number;
}

export interface TaskOverdueCondition {
  priorities?: string[];
}

export interface WeeklyScheduleTriggerConfig {
  /** 0 = Sunday ... 6 = Saturday, matching Date.prototype.getDay(). */
  dayOfWeek: number;
  /** 0-23, UTC — see ADR 0014 for the known timezone simplification. */
  hour: number;
}

export interface Automation {
  id: string;
  name: string;
  triggerType: AutomationTriggerType;
  triggerConfig: TaskOverdueTriggerConfig | WeeklyScheduleTriggerConfig;
  condition: TaskOverdueCondition | null;
  actionType: AutomationActionType;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
}
