"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { WeeklyScheduleAutomationForm } from "./weekly-schedule-automation-form";

export function NewWeeklyScheduleAutomationModal() {
  return (
    <Modal>
      <ModalTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Weekly Reminder
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New Weekly Schedule Automation</ModalTitle>
        </ModalHeader>
        <WeeklyScheduleAutomationForm />
      </ModalContent>
    </Modal>
  );
}
