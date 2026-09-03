import { Badge } from "@/components/ui/badge";
import type { TaskStatus } from "@/features/tasks/types";

const VARIANT: Record<TaskStatus, "neutral" | "accent" | "warning" | "success" | "danger"> = {
  inbox: "neutral",
  next: "neutral",
  today: "accent",
  in_progress: "warning",
  waiting: "warning",
  done: "success",
  cancelled: "danger",
};

const LABEL: Record<TaskStatus, string> = {
  inbox: "Backlog",
  next: "This Week",
  today: "Today",
  in_progress: "In Progress",
  waiting: "Waiting",
  done: "Done",
  cancelled: "Cancelled",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
