import type { TaskStatus } from "@/features/tasks/types";
import type { CategoryColor } from "@/lib/design/category-colors";

/**
 * Category color per Kanban column, purely for at-a-glance identification
 * while scrolling/dragging — see ADR 0019/0020. Priority (critical/high/
 * medium/low, `TaskPriorityBadge`) keeps its own semantic danger/warning
 * colors untouched; this is a separate, decorative axis.
 */
export const TASK_STATUS_ACCENT: Record<TaskStatus, CategoryColor> = {
  inbox: "slate",
  next: "cyan",
  today: "blue",
  in_progress: "amber",
  waiting: "orange",
  done: "teal",
  cancelled: "rose",
};
