"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { updateIdea } from "@/features/ideas/actions";
import type { Idea } from "@/features/ideas/types";
import { IdeaForm } from "./idea-form";

export function EditIdeaModal({
  open,
  onOpenChange,
  idea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
}) {
  if (!idea) return null;
  const boundUpdate = updateIdea.bind(null, idea.id);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">Edit Idea</ModalTitle>
        </ModalHeader>
        <IdeaForm action={boundUpdate} initialValues={idea} submitLabel="Save Changes" />
      </ModalContent>
    </Modal>
  );
}
