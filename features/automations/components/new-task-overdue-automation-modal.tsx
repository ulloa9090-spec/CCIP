"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { TaskOverdueAutomationForm } from "./task-overdue-automation-form";

export function NewTaskOverdueAutomationModal() {
  return (
    <Modal>
      <ModalTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Overdue Task Alert
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New Overdue Task Automation</ModalTitle>
        </ModalHeader>
        <TaskOverdueAutomationForm />
      </ModalContent>
    </Modal>
  );
}
