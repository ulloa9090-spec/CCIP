"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal";
import {
  attemptSetPrimary,
  resolveMakeSecondary,
  resolveReplacePrimary,
} from "@/features/projects/actions";

/**
 * The Active Project rule's conflict flow (blueprint §D.2 / §0.6).
 * "Send to Parking Lot" isn't offered — Ideas don't exist until Phase 8.
 */
export function PrimaryProjectControl({
  projectId,
  isPrimaryActive,
}: {
  projectId: string;
  isPrimaryActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [conflict, setConflict] = useState<{ currentId: string; currentName: string } | null>(null);

  if (isPrimaryActive) {
    return (
      <Badge variant="accent" className="gap-1">
        <Star className="h-3 w-3" />
        Primary Active
      </Badge>
    );
  }

  function attempt() {
    startTransition(async () => {
      const result = await attemptSetPrimary(projectId);
      if (result.status === "conflict") {
        setConflict({ currentId: result.currentId, currentName: result.currentName });
      }
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" loading={pending} onClick={attempt}>
        Make Primary Active
      </Button>

      <Modal open={conflict !== null} onOpenChange={(open) => !open && setConflict(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle className="text-sm font-semibold text-text-primary">
              You already have a primary project
            </ModalTitle>
          </ModalHeader>
          <p className="mb-4 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{conflict?.currentName}</span> is
            currently your Primary Active Project. Only one project can hold that spot at a time.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  if (!conflict) return;
                  await resolveReplacePrimary(projectId, conflict.currentId);
                  setConflict(null);
                })
              }
            >
              Replace Current Primary
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  await resolveMakeSecondary(projectId);
                  setConflict(null);
                })
              }
            >
              Make This Secondary Instead
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConflict(null)}>
              Cancel
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
