import { Badge } from "@/components/ui/badge";
import type { GoalStatus } from "@/features/goals/types";

const VARIANT: Record<GoalStatus, "neutral" | "accent" | "warning" | "success" | "danger"> = {
  planned: "neutral",
  active: "accent",
  paused: "warning",
  completed: "success",
  cancelled: "danger",
};

const LABEL: Record<GoalStatus, string> = {
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
