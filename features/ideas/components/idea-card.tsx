"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Idea } from "@/features/ideas/types";

function ScoreBadge({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <span className="rounded-(--radius-token-sm) bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
      {label} {value}
    </span>
  );
}

export function IdeaCard({
  idea,
  onOpen,
  onPromote,
}: {
  idea: Idea;
  onOpen: () => void;
  onPromote: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id });
  const canPromote = idea.status !== "promoted" && idea.status !== "rejected" && idea.status !== "archived";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "flex touch-none cursor-grab flex-col gap-2 rounded-(--radius-token-sm) border border-border bg-surface-raised p-3 text-sm shadow-sm active:cursor-grabbing",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isDragging && "opacity-50",
      )}
    >
      <p className="font-medium text-text-primary">{idea.title}</p>
      {(idea.impact || idea.effort || idea.urgency) && (
        <div className="flex flex-wrap gap-1">
          <ScoreBadge label="Impact" value={idea.impact} />
          <ScoreBadge label="Effort" value={idea.effort} />
          <ScoreBadge label="Urgency" value={idea.urgency} />
        </div>
      )}
      {canPromote && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPromote();
          }}
          className="flex items-center gap-1 self-start text-xs font-medium text-accent hover:underline"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Promote
        </button>
      )}
    </div>
  );
}
