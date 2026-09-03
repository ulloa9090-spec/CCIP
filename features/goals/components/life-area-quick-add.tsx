"use client";

import { Plus } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/types/action-result";
import { createLifeArea } from "@/features/goals/actions";

const initialState: ActionResult = {};

export function LifeAreaQuickAdd() {
  const [state, formAction, pending] = useActionState(createLifeArea, initialState);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-(--radius-token-sm) border border-dashed border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Add area
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        formAction(fd);
        formRef.current?.reset();
      }}
      className="flex items-center gap-2"
    >
      <Input name="name" placeholder="Area name" className="h-8 w-40 text-xs" autoFocus />
      <Button type="submit" size="sm" loading={pending}>
        Add
      </Button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-text-secondary hover:text-text-primary"
      >
        Cancel
      </button>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
    </form>
  );
}
