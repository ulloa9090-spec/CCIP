"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaskOverdueAutomation } from "@/features/automations/actions";
import { TASK_PRIORITIES } from "@/lib/validation/automations";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function TaskOverdueAutomationForm() {
  const [state, formAction, pending] = useActionState(createTaskOverdueAutomation, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="toa-name" className="text-sm font-medium text-text-primary">
          Name
        </label>
        <Input id="toa-name" name="name" placeholder="e.g. Overdue critical tasks" autoFocus required />
        {state.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="toa-minDays" className="text-sm font-medium text-text-primary">
          Notify when overdue by at least
        </label>
        <Input id="toa-minDays" name="minDays" type="number" min={1} max={365} defaultValue={3} required />
        {state.fieldErrors?.minDays && <p className="text-xs text-danger">{state.fieldErrors.minDays}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-primary">Priorities (leave all unchecked for any)</span>
        <div className="flex flex-wrap gap-3">
          {TASK_PRIORITIES.map((p) => (
            <label key={p} className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input type="checkbox" name="priorities" value={p} className="h-4 w-4" />
              {p}
            </label>
          ))}
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        Create Automation
      </Button>
    </form>
  );
}
