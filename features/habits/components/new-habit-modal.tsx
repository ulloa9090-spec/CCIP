"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createHabit } from "@/features/habits/actions";
import type { Goal } from "@/features/goals/types";
import type { Project } from "@/features/projects/types";
import { HabitForm } from "./habit-form";

export function NewHabitModal({
  goals,
  projects,
  triggerLabel = "New Habit",
}: {
  goals: Goal[];
  projects: Project[];
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
          <ModalTitle className="text-sm font-semibold text-text-primary">New Habit</ModalTitle>
        </ModalHeader>
        <HabitForm action={createHabit} goals={goals} projects={projects} submitLabel="Create Habit" />
      </ModalContent>
    </Modal>
  );
}
