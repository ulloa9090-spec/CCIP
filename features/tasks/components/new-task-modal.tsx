"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createTask } from "@/features/tasks/actions";
import type { TaskStatus } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import type { Goal } from "@/features/goals/types";
import { TaskForm } from "./task-form";

export function NewTaskModal({
  projects,
  goals,
  defaultStatus,
  triggerLabel = "New Task",
}: {
  projects: Project[];
  goals: Goal[];
  defaultStatus?: TaskStatus;
  triggerLabel?: string;
}) {
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
          <ModalTitle className="text-sm font-semibold text-text-primary">New Task</ModalTitle>
        </ModalHeader>
        <TaskForm
          action={createTask}
          projects={projects}
          goals={goals}
          defaultStatus={defaultStatus}
          submitLabel="Create Task"
        />
      </ModalContent>
    </Modal>
  );
}
