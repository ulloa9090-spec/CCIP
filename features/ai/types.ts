import type { AiContextType } from "./context/types";

export type { AiContextType };

export interface AiThread {
  id: string;
  title: string;
  contextType: AiContextType;
  archived: boolean;
  createdAt: string;
}

export type AiMessageRole = "user" | "assistant" | "system";

export interface AiMessageRecord {
  id: string;
  threadId: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

export type AiInsightType = "plan_breakdown" | "suggest_reschedule";
export type AiInsightStatus = "pending" | "approved" | "rejected" | "expired";

export interface PlanBreakdownItem {
  title: string;
  kind: "milestone" | "task";
  priority?: string;
}

export interface PlanBreakdownPayload {
  kind: "plan_breakdown";
  targetType: "goal" | "project";
  targetId: string;
  targetTitle: string;
  items: PlanBreakdownItem[];
}

export interface SuggestReschedulePayload {
  kind: "suggest_reschedule";
  taskId: string;
  taskTitle: string;
  fromDate: string | null;
  toDate: string;
  reason: string;
}

export type AiInsightPayload = PlanBreakdownPayload | SuggestReschedulePayload;

export interface AiInsight {
  id: string;
  userId: string;
  threadId: string | null;
  type: AiInsightType;
  payload: AiInsightPayload;
  status: AiInsightStatus;
  resolvedAt: string | null;
  createdAt: string;
}
