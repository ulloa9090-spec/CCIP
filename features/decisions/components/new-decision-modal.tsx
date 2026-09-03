"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createDecision } from "@/features/decisions/actions";
import type { Goal } from "@/features/goals/types";
import type { Project } from "@/features/projects/types";
import type { Task } from "@/features/tasks/types";
import { DecisionForm } from "./decision-form";

export function NewDecisionModal({ goals, projects, tasks }: { goals: Goal[]; projects: Project[]; tasks: Task[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Decision
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">Log a Decision</ModalTitle>
        </ModalHeader>
        <DecisionForm action={createDecision} goals={goals} projects={projects} tasks={tasks} submitLabel="Log Decision" />
      </ModalContent>
    </Modal>
  );
}
