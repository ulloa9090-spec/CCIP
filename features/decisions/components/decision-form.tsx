"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import type { Goal } from "@/features/goals/types";
import type { Project } from "@/features/projects/types";
import type { Task } from "@/features/tasks/types";

const initialState: ActionResult = {};

export function DecisionForm({
  action,
  goals,
  projects,
  tasks,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="dc-title" name="title" autoFocus required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-context" className="text-sm font-medium text-text-primary">
          Context
        </label>
        <Textarea id="dc-context" name="context" placeholder="What's the situation?" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-options" className="text-sm font-medium text-text-primary">
          Options considered (one per line)
        </label>
        <Textarea id="dc-options" name="options" placeholder={"Option A\nOption B\nOption C"} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-chosenOption" className="text-sm font-medium text-text-primary">
          Chosen option
        </label>
        <Input id="dc-chosenOption" name="chosenOption" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dc-reasoning" className="text-sm font-medium text-text-primary">
          Reasoning
        </label>
        <Textarea id="dc-reasoning" name="reasoning" placeholder="Why this option?" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dc-expectedOutcome" className="text-sm font-medium text-text-primary">
            Expected outcome
          </label>
          <Input id="dc-expectedOutcome" name="expectedOutcome" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dc-reviewDate" className="text-sm font-medium text-text-primary">
            Review date
          </label>
          <Input id="dc-reviewDate" name="reviewDate" type="date" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dc-goalId" className="text-sm font-medium text-text-primary">
            Goal
          </label>
          <Select name="goalId">
            <SelectTrigger id="dc-goalId">
              <SelectValue placeholder="None" />
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
          <label htmlFor="dc-projectId" className="text-sm font-medium text-text-primary">
            Project
          </label>
          <Select name="projectId">
            <SelectTrigger id="dc-projectId">
              <SelectValue placeholder="None" />
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dc-taskId" className="text-sm font-medium text-text-primary">
            Task
          </label>
          <Select name="taskId">
            <SelectTrigger id="dc-taskId">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
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
