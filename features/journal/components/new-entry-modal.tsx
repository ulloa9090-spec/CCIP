"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createJournalEntry } from "@/features/journal/actions";
import type { Goal } from "@/features/goals/types";
import type { Project } from "@/features/projects/types";
import type { Task } from "@/features/tasks/types";
import type { Decision } from "@/features/decisions/types";
import { JournalEntryForm } from "./journal-entry-form";

export function NewEntryModal({
  goals,
  projects,
  tasks,
  decisions,
}: {
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  decisions: Decision[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New Journal Entry</ModalTitle>
        </ModalHeader>
        <JournalEntryForm
          action={createJournalEntry}
          goals={goals}
          projects={projects}
          tasks={tasks}
          decisions={decisions}
          submitLabel="Save Entry"
        />
      </ModalContent>
    </Modal>
  );
}
