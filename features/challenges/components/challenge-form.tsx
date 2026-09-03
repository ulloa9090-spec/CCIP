"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import type { Goal } from "@/features/goals/types";

const initialState: ActionResult = {};

export function ChallengeForm({
  action,
  goals,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  goals: Goal[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ch-title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="ch-title" name="title" placeholder="e.g. 21 Days of Deep Work" autoFocus required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ch-dailyAction" className="text-sm font-medium text-text-primary">
          Daily action
        </label>
        <Textarea id="ch-dailyAction" name="dailyAction" placeholder="What do you do each day?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ch-startDate" className="text-sm font-medium text-text-primary">
            Start date
          </label>
          <Input
            id="ch-startDate"
            name="startDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ch-goalId" className="text-sm font-medium text-text-primary">
            Goal (optional)
          </label>
          <Select name="goalId">
            <SelectTrigger id="ch-goalId">
              <SelectValue placeholder="Not linked to a goal" />
            </SelectTrigger>
            <SelectContent>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
