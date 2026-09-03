"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { clearMostImportantTask, toggleTaskDone } from "@/features/tasks/actions";
import type { Task } from "@/features/tasks/types";
import { cn } from "@/lib/utils/cn";

export function MostImportantTaskCard({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <EmptyState
        title="No Most Important Task set"
        description="Star a task below, or set one from the Tasks board."
        action={
          <Button size="sm" asChild>
            <Link href="/tasks">Go to Tasks</Link>
          </Button>
        }
      />
    );
  }

  const done = task.status === "done";

  return (
    <div className="flex items-center gap-3 rounded-(--radius-token-md) border border-warning/40 bg-warning/5 p-4">
      <button
        type="button"
        onClick={() => toggleTaskDone(task.id, !done)}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          done ? "border-success bg-success text-white" : "border-warning",
        )}
      >
        {done && <Check className="h-4 w-4" />}
      </button>
      <p
        className={cn(
          "flex-1 text-base font-semibold text-text-primary",
          done && "text-text-secondary line-through",
        )}
      >
        {task.title}
      </p>
      <button
        type="button"
        onClick={() => clearMostImportantTask(task.id)}
        aria-label="Clear Most Important Task"
        className="text-text-secondary hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
