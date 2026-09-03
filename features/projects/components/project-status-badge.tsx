import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/features/projects/types";

const VARIANT: Record<ProjectStatus, "neutral" | "accent" | "warning" | "success" | "danger"> = {
  active: "accent",
  secondary: "neutral",
  waiting: "warning",
  someday: "neutral",
  completed: "success",
  archived: "danger",
};

const LABEL: Record<ProjectStatus, string> = {
  active: "Active",
  secondary: "Secondary",
  waiting: "Waiting",
  someday: "Someday",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>;
}
