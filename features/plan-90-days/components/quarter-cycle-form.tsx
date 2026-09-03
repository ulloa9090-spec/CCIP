"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/types/action-result";
import { createQuarterCycle } from "@/features/plan-90-days/actions";

const initialState: ActionResult = {};

export function QuarterCycleForm() {
  const [state, formAction, pending] = useActionState(createQuarterCycle, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-text-primary">
          Cycle name
        </label>
        <Input id="name" name="name" placeholder="e.g. Q4 2026" required />
        {state.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium text-text-primary">
            Start date
          </label>
          <Input id="startDate" name="startDate" type="date" required />
          {state.fieldErrors?.startDate && (
            <p className="text-xs text-danger">{state.fieldErrors.startDate}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-sm font-medium text-text-primary">
            End date
          </label>
          <Input id="endDate" name="endDate" type="date" required />
          {state.fieldErrors?.endDate && (
            <p className="text-xs text-danger">{state.fieldErrors.endDate}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="expectedOutcome" className="text-sm font-medium text-text-primary">
          Expected outcome
        </label>
        <Textarea id="expectedOutcome" name="expectedOutcome" placeholder="What does success look like?" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="primaryIndicator" className="text-sm font-medium text-text-primary">
          Primary indicator
        </label>
        <Input id="primaryIndicator" name="primaryIndicator" placeholder="The one number that matters" />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-text-primary">3 major milestones</p>
        <Input name="milestone1" placeholder="Milestone 1" />
        <Input name="milestone2" placeholder="Milestone 2" />
        <Input name="milestone3" placeholder="Milestone 3" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="strategy" className="text-sm font-medium text-text-primary">
          Strategy
        </label>
        <Textarea id="strategy" name="strategy" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="risks" className="text-sm font-medium text-text-primary">
          Risks
        </label>
        <Textarea id="risks" name="risks" />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        Start Cycle
      </Button>
    </form>
  );
}
