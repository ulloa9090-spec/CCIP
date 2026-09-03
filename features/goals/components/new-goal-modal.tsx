"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createGoal } from "@/features/goals/actions";
import type { LifeArea } from "@/features/goals/types";
import { GoalForm } from "./goal-form";

export function NewGoalModal({
  lifeAreas,
  cycles,
  triggerLabel = "New Goal",
}: {
  lifeAreas: LifeArea[];
  cycles: { id: string; name: string }[];
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
          <ModalTitle className="text-sm font-semibold text-text-primary">New Goal</ModalTitle>
        </ModalHeader>
        <GoalForm action={createGoal} lifeAreas={lifeAreas} cycles={cycles} submitLabel="Create Goal" />
      </ModalContent>
    </Modal>
  );
}
