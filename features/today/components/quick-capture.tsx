"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTask } from "@/features/tasks/actions";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function QuickCapture() {
  const [state, formAction, pending] = useActionState(createTask, initialState);

  return (
    <form
      action={formAction}
      className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-surface-raised p-3"
    >
      <input type="hidden" name="status" value="inbox" />
      <input type="hidden" name="priority" value="medium" />
      <Input name="title" placeholder="Quick capture — add a task…" className="flex-1" required />
      <Button type="submit" size="sm" loading={pending} className="gap-1.5 shrink-0">
        <Plus className="h-4 w-4" />
        Add
      </Button>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
