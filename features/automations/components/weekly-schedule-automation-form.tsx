"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createWeeklyScheduleAutomation } from "@/features/automations/actions";
import { WEEKDAY_OPTIONS } from "@/lib/validation/automations";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function WeeklyScheduleAutomationForm() {
  const [state, formAction, pending] = useActionState(createWeeklyScheduleAutomation, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wsa-name" className="text-sm font-medium text-text-primary">
          Name
        </label>
        <Input id="wsa-name" name="name" placeholder="e.g. Weekly Review reminder" autoFocus required />
        {state.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wsa-dayOfWeek" className="text-sm font-medium text-text-primary">
            Day
          </label>
          <Select name="dayOfWeek" defaultValue="0">
            <SelectTrigger id="wsa-dayOfWeek">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_OPTIONS.map((d) => (
                <SelectItem key={d.value} value={String(d.value)}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wsa-hour" className="text-sm font-medium text-text-primary">
            Hour (UTC, 0-23)
          </label>
          <Input id="wsa-hour" name="hour" type="number" min={0} max={23} defaultValue={18} required />
          {state.fieldErrors?.hour && <p className="text-xs text-danger">{state.fieldErrors.hour}</p>}
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
