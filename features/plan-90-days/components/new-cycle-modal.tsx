"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { QuarterCycleForm } from "./quarter-cycle-form";

export function NewCycleModal({ triggerLabel = "Start a 90-Day Cycle" }: { triggerLabel?: string }) {
  return (
    <Modal>
      <ModalTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New 90-Day Cycle</ModalTitle>
        </ModalHeader>
        <QuarterCycleForm />
      </ModalContent>
    </Modal>
  );
}
