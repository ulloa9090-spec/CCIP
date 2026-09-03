"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils/cn";
import type { Idea, IdeaStatus } from "@/features/ideas/types";
import { IdeaCard } from "./idea-card";

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
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} onOpen={() => onOpen(idea)} onPromote={() => onPromote(idea)} />
        ))}
        {ideas.length === 0 && (
          <p className="rounded-(--radius-token-sm) border border-dashed border-border p-3 text-center text-xs text-text-secondary">
            Nothing here
          </p>
        )}
      </div>
    </div>
  );
}
