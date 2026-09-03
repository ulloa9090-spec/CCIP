"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createProject } from "@/features/projects/actions";
import type { Goal } from "@/features/goals/types";
import { ProjectForm } from "./project-form";

export function NewProjectModal({ goals, triggerLabel = "New Project" }: { goals: Goal[]; triggerLabel?: string }) {
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
          <ModalTitle className="text-sm font-semibold text-text-primary">New Project</ModalTitle>
        </ModalHeader>
        <ProjectForm action={createProject} goals={goals} submitLabel="Create Project" />
      </ModalContent>
    </Modal>
  );
}
