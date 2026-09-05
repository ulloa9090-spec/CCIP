"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_BORDER_CLASSES } from "@/lib/design/category-colors";
import type { Task } from "@/features/tasks/types";
import { TaskPriorityBadge } from "./task-priority-badge";
import { TASK_STATUS_ACCENT } from "./status-accent";

export function KanbanCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className={cn(
        "flex touch-none flex-col gap-2 rounded-(--radius-token-sm) border border-border bg-surface-raised p-3 text-sm shadow-sm",
        "border-l-4",
        CATEGORY_BORDER_CLASSES[TASK_STATUS_ACCENT[task.status]],
        "cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isDragging && "opacity-50",
      )}
    >
      <p className="font-medium text-text-primary">{task.title}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <TaskPriorityBadge priority={task.priority} />
        {task.projectId && task.projectName && (
          <Link
            href={`/projects/${task.projectId}`}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-xs text-text-secondary hover:text-accent hover:underline"
          >
            {task.projectName}
          </Link>
        )}
      </div>
      {task.dueDate && <p className="text-xs text-text-secondary">Due {task.dueDate}</p>}
    </div>
  );
}
