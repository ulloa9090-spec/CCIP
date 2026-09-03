"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { promoteIdea } from "@/features/ideas/actions";
import type { Idea } from "@/features/ideas/types";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  secondary: "Secondary",
  waiting: "Waiting",
  someday: "Someday",
};

function PromoteIdeaForm({ idea }: { idea: Idea }) {
  const boundPromote = promoteIdea.bind(null, idea.id);
  const [state, formAction, pending] = useActionState(boundPromote, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        This creates a new project from the idea&apos;s title and description.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="promote-projectStatus" className="text-sm font-medium text-text-primary">
          Initial project status
        </label>
        <Select name="projectStatus" defaultValue="someday">
          <SelectTrigger id="promote-projectStatus">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">
        Promote to Project
      </Button>
    </form>
  );
}

export function PromoteIdeaModal({
  open,
  onOpenChange,
  idea,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: Idea | null;
}) {
  if (!idea) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="text-sm font-semibold text-text-primary">Promote &quot;{idea.title}&quot;</ModalTitle>
        </ModalHeader>
        <PromoteIdeaForm idea={idea} />
      </ModalContent>
    </Modal>
  );
}
