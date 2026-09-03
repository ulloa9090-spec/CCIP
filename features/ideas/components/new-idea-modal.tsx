"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createIdea } from "@/features/ideas/actions";
import { IdeaForm } from "./idea-form";

export function NewIdeaModal({ triggerLabel = "New Idea" }: { triggerLabel?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New Idea</ModalTitle>
        </ModalHeader>
        <IdeaForm action={createIdea} submitLabel="Capture Idea" />
      </ModalContent>
    </Modal>
  );
}
