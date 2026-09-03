"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import { HABIT_FREQUENCIES } from "@/lib/validation/habits";
import type { Habit } from "@/features/habits/types";
import type { Goal } from "@/features/goals/types";
import type { Project } from "@/features/projects/types";

const initialState: ActionResult = {};

const FREQUENCY_LABELS: Record<(typeof HABIT_FREQUENCIES)[number], string> = {
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  custom: "Custom days",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HabitForm({
  action,
  goals,
  projects,
  initialValues,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  goals: Goal[];
  projects: Project[];
  initialValues?: Partial<Habit>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [frequency, setFrequency] = useState<(typeof HABIT_FREQUENCIES)[number]>(
    initialValues?.frequency ?? "daily",
  );
  const customDaySet = new Set(initialValues?.customDays ?? []);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-name" className="text-sm font-medium text-text-primary">
          Name
        </label>
        <Input id="habit-name" name="name" defaultValue={initialValues?.name} required />
        {state.fieldErrors?.name && <p className="text-xs text-danger">{state.fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-description" className="text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea id="habit-description" name="description" defaultValue={initialValues?.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="habit-category" className="text-sm font-medium text-text-primary">
            Category
          </label>
          <Input id="habit-category" name="category" defaultValue={initialValues?.category ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="habit-target" className="text-sm font-medium text-text-primary">
            Target per period
          </label>
          <Input
            id="habit-target"
            name="target"
            type="number"
            min={1}
            max={20}
            defaultValue={initialValues?.target ?? 1}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-frequency" className="text-sm font-medium text-text-primary">
          Frequency
        </label>
        <Select name="frequency" value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
          <SelectTrigger id="habit-frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HABIT_FREQUENCIES.map((f) => (
              <SelectItem key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {frequency === "custom" && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-primary">Which days?</span>
          <div className="flex flex-wrap gap-3">
            {DAY_LABELS.map((label, i) => (
              <label key={i} className="flex items-center gap-1.5 text-sm text-text-secondary">
                <input type="checkbox" name="customDays" value={i} defaultChecked={customDaySet.has(i)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="habit-goalId" className="text-sm font-medium text-text-primary">
            Goal (optional)
          </label>
          <Select name="goalId" defaultValue={initialValues?.goalId ?? undefined}>
            <SelectTrigger id="habit-goalId">
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
          <label htmlFor="habit-projectId" className="text-sm font-medium text-text-primary">
            Project (optional)
          </label>
          <Select name="projectId" defaultValue={initialValues?.projectId ?? undefined}>
            <SelectTrigger id="habit-projectId">
              <SelectValue placeholder="Not linked to a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="habit-startDate" className="text-sm font-medium text-text-primary">
          Start date
        </label>
        <Input
          id="habit-startDate"
          name="startDate"
          type="date"
          defaultValue={initialValues?.startDate ?? new Date().toISOString().slice(0, 10)}
        />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
