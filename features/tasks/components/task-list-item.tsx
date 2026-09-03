"use client";

import { Check, Star } from "lucide-react";
import { setMostImportantTask, toggleTaskDone } from "@/features/tasks/actions";
import type { Task } from "@/features/tasks/types";
import { cn } from "@/lib/utils/cn";
import { TaskStatusBadge } from "./task-status-badge";

export function TaskListItem({
  task,
  showStatus = true,
  allowMit = false,
}: {
  task: Task;
  showStatus?: boolean;
  /** Shows a star button to promote this task to today's Most Important Task. */
  allowMit?: boolean;
}) {
  const done = task.status === "done";

  return (
    <div className="flex items-center gap-2 rounded-(--radius-token-sm) px-1 py-1.5 text-sm hover:bg-surface">
      <button
        type="button"
        onClick={() => toggleTaskDone(task.id, !done)}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          done ? "border-success bg-success text-white" : "border-border",
        )}
      >
        {done && <Check className="h-3 w-3" />}
      </button>
      <span className={cn("flex-1", done && "text-text-secondary line-through")}>{task.title}</span>
      {showStatus && <TaskStatusBadge status={task.status} />}
      {allowMit && !task.isMit && (
        <button
          type="button"
          onClick={() => setMostImportantTask(task.id)}
          aria-label={`Set "${task.title}" as today's Most Important Task`}
          className="text-text-secondary hover:text-warning focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Star className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
