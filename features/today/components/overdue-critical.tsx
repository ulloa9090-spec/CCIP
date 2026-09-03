"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Task } from "@/features/tasks/types";
import { TaskListItem } from "@/features/tasks/components";
import { cn } from "@/lib/utils/cn";

export function OverdueAndCritical({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-(--radius-token-md) border border-danger/30 bg-danger/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between text-sm font-semibold text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span>Overdue &amp; Critical</span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-danger px-1.5 py-0.5 text-xs font-semibold text-white">
            {tasks.length}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="flex flex-col">
          {tasks.map((t) => (
            <TaskListItem key={t.id} task={t} allowMit />
          ))}
        </div>
      )}
    </div>
  );
}
