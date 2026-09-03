import { Badge } from "@/components/ui/badge";
import type { TaskPriority } from "@/features/tasks/types";

const VARIANT: Record<TaskPriority, "neutral" | "accent" | "warning" | "danger"> = {
  critical: "danger",
  high: "warning",
  medium: "accent",
  low: "neutral",
};

const LABEL: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={VARIANT[priority]}>{LABEL[priority]}</Badge>;
}
