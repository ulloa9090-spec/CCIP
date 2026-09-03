"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { createTimeBlock } from "@/features/calendar/actions";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import { TimeBlockForm } from "./time-block-form";

export function NewTimeBlockModal({
  open,
  onOpenChange,
  tasks,
  projects,
  startAt,
  endAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  projects: Project[];
  startAt: Date;
  endAt: Date;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New Time Block</ModalTitle>
        </ModalHeader>
        <TimeBlockForm
          action={createTimeBlock}
          tasks={tasks}
          projects={projects}
          initialValues={{ startAt, endAt }}
          submitLabel="Create Time Block"
        />
      </ModalContent>
    </Modal>
  );
}
