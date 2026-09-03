"use client";

import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { deleteTimeBlock, updateTimeBlock } from "@/features/calendar/actions";
import type { TimeBlock } from "@/features/calendar/types";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import { TimeBlockForm } from "./time-block-form";

export function EditTimeBlockModal({
  open,
  onOpenChange,
  block,
  tasks,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: TimeBlock | null;
  tasks: Task[];
  projects: Project[];
}) {
  if (!block) return null;
  const boundUpdate = updateTimeBlock.bind(null, block.id);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">Edit Time Block</ModalTitle>
        </ModalHeader>
        <TimeBlockForm
          action={boundUpdate}
          tasks={tasks}
          projects={projects}
          initialValues={{
            title: block.title,
            taskId: block.taskId,
            projectId: block.projectId,
            focusContext: block.focusContext,
            startAt: new Date(block.startAt),
            endAt: new Date(block.endAt),
          }}
          submitLabel="Save Changes"
          onDelete={() => {
            deleteTimeBlock(block.id);
            onOpenChange(false);
          }}
        />
      </ModalContent>
    </Modal>
  );
}
