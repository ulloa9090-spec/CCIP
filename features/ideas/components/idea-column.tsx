"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils/cn";
import type { Idea, IdeaStatus } from "@/features/ideas/types";
import { IdeaCard } from "./idea-card";

/** blueprint §O.10 — a Kanban board isn't a flat list (no page-number
 * pagination makes sense mid-column), so a large column is capped and
 * expandable instead — see ADR 0016. */
const COLUMN_RENDER_CAP = 50;

export function IdeaColumn({
  status,
  label,
  ideas,
  onOpen,
  onPromote,
}: {
  status: IdeaStatus;
  label: string;
  ideas: Idea[];
  onOpen: (idea: Idea) => void;
  onPromote: (idea: Idea) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showAll, setShowAll] = useState(false);
  const visibleIdeas = showAll ? ideas : ideas.slice(0, COLUMN_RENDER_CAP);
  const hiddenCount = ideas.length - visibleIdeas.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-64 flex-1 flex-col gap-3 rounded-(--radius-token-md) border border-border bg-surface p-3",
        isOver && "border-accent bg-accent/5",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-text-primary">{label}</h2>
        <span className="text-xs text-text-secondary">{ideas.length}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {visibleIdeas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onOpen={() => onOpen(idea)} onPromote={() => onPromote(idea)} />
        ))}
        {ideas.length === 0 && (
          <p className="rounded-(--radius-token-sm) border border-dashed border-border p-3 text-center text-xs text-text-secondary">
            Nothing here
          </p>
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-(--radius-token-sm) border border-dashed border-border p-2 text-center text-xs font-medium text-text-secondary hover:text-accent"
          >
            Show {hiddenCount} more
          </button>
        )}
      </div>
    </div>
  );
}
