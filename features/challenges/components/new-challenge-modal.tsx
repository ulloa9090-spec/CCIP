"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal";
import { createChallenge } from "@/features/challenges/actions";
import type { Goal } from "@/features/goals/types";
import { ChallengeForm } from "./challenge-form";

export function NewChallengeModal({ goals }: { goals: Goal[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Challenge
        </Button>
      </ModalTrigger>
      <ModalContent className="max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">New 21-Day Challenge</ModalTitle>
        </ModalHeader>
        <ChallengeForm action={createChallenge} goals={goals} submitLabel="Start Challenge" />
      </ModalContent>
    </Modal>
  );
}
