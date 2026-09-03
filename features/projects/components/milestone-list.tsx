"use client";

import { Check, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types/action-result";
import { addMilestone, toggleMilestoneStatus } from "@/features/projects/actions";
import type { Milestone } from "@/features/projects/types";
import { cn } from "@/lib/utils/cn";

const initialState: ActionResult = {};

export function MilestoneList({ projectId, milestones }: { projectId: string; milestones: Milestone[] }) {
  const boundAdd = addMilestone.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {milestones.length === 0 ? (
        <p className="text-sm text-text-secondary">No milestones yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {milestones.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => toggleMilestoneStatus(projectId, m.id, m.status !== "done")}
                className="flex w-full items-center gap-2 rounded-(--radius-token-sm) px-1 py-1 text-left text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    m.status === "done" ? "border-success bg-success text-white" : "border-border",
                  )}
                  aria-hidden="true"
                >
                  {m.status === "done" && <Check className="h-3 w-3" />}
                </span>
                <span className={cn(m.status === "done" && "text-text-secondary line-through")}>
                  {m.title}
                </span>
                {m.targetDate && (
                  <span className="ml-auto text-xs text-text-secondary">
                    {new Date(m.targetDate).toLocaleDateString()}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form action={formAction} className="flex items-center gap-2">
          <Input name="title" placeholder="Milestone title" className="flex-1" autoFocus />
          <Input name="targetDate" type="date" className="w-40" />
          <Button type="submit" size="sm" loading={pending}>
            Add
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 self-start text-xs font-medium text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </button>
      )}
      {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
    </div>
  );
}
