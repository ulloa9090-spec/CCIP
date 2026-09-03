"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import { IDEA_STATUSES } from "@/lib/validation/ideas";
import { updateIdeaStatus } from "@/features/ideas/actions";
import type { Idea, IdeaStatus } from "@/features/ideas/types";
import { IdeaColumn } from "./idea-column";
import { EditIdeaModal } from "./edit-idea-modal";
import { PromoteIdeaModal } from "./promote-idea-modal";

const COLUMN_LABELS: Record<IdeaStatus, string> = {
  new: "New",
  review_later: "Review Later",
  evaluating: "Evaluating",
  promoted: "Promoted",
  rejected: "Rejected",
  archived: "Archived",
};

export function IdeaBoard({ ideas: initialIdeas }: { ideas: Idea[] }) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [promotingIdea, setPromotingIdea] = useState<Idea | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const ideaId = String(active.id);
    const newStatus = String(over.id) as IdeaStatus;
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea || idea.status === newStatus) return;

    setIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, status: newStatus } : i)));
    updateIdeaStatus(ideaId, newStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto p-6">
        {IDEA_STATUSES.map((status) => (
          <IdeaColumn
            key={status}
            status={status}
            label={COLUMN_LABELS[status]}
            ideas={ideas.filter((i) => i.status === status)}
            onOpen={setEditingIdea}
            onPromote={setPromotingIdea}
          />
        ))}
      </div>

      <EditIdeaModal open={editingIdea !== null} onOpenChange={(open) => !open && setEditingIdea(null)} idea={editingIdea} />
      <PromoteIdeaModal
        open={promotingIdea !== null}
        onOpenChange={(open) => !open && setPromotingIdea(null)}
        idea={promotingIdea}
      />
    </DndContext>
  );
}
