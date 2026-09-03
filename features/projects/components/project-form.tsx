"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import { PROJECT_STATUSES } from "@/lib/validation/projects";
import type { Project } from "@/features/projects/types";
import type { Goal } from "@/features/goals/types";

const initialState: ActionResult = {};

const STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  active: "Active",
  secondary: "Secondary",
  waiting: "Waiting",
  someday: "Someday",
  completed: "Completed",
  archived: "Archived",
};

export function ProjectForm({
  action,
  goals,
  initialValues,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  goals: Goal[];
  initialValues?: Partial<Project>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-text-primary">
          Name
        </label>
        <Input id="name" name="name" defaultValue={initialValues?.name} required />
        {state.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="goalId" className="text-sm font-medium text-text-primary">
            Goal (optional)
          </label>
          <Select name="goalId" defaultValue={initialValues?.goalId ?? undefined}>
            <SelectTrigger id="goalId">
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-text-primary">
            Status
          </label>
          <Select name="status" defaultValue={initialValues?.status ?? "someday"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium text-text-primary">
            Start date
          </label>
          <Input id="startDate" name="startDate" type="date" defaultValue={initialValues?.startDate ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deadline" className="text-sm font-medium text-text-primary">
            Deadline
          </label>
          <Input id="deadline" name="deadline" type="date" defaultValue={initialValues?.deadline ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <Textarea id="notes" name="notes" defaultValue={initialValues?.notes ?? ""} />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
