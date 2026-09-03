"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/validation/tasks";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";
import type { Goal } from "@/features/goals/types";

const initialState: ActionResult = {};

const STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  inbox: "Backlog",
  next: "This Week",
  today: "Today",
  in_progress: "In Progress",
  waiting: "Waiting",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<(typeof TASK_PRIORITIES)[number], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function TaskForm({
  action,
  projects,
  goals,
  initialValues,
  defaultStatus,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  projects: Project[];
  goals: Goal[];
  initialValues?: Partial<Task>;
  defaultStatus?: Task["status"];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="title" name="title" defaultValue={initialValues?.title} required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea id="description" name="description" defaultValue={initialValues?.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="projectId" className="text-sm font-medium text-text-primary">
            Project (optional)
          </label>
          <Select name="projectId" defaultValue={initialValues?.projectId ?? undefined}>
            <SelectTrigger id="projectId">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium text-text-primary">
            Status
          </label>
          <Select name="status" defaultValue={initialValues?.status ?? defaultStatus ?? "inbox"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="priority" className="text-sm font-medium text-text-primary">
            Priority
          </label>
          <Select name="priority" defaultValue={initialValues?.priority ?? "medium"}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dueDate" className="text-sm font-medium text-text-primary">
            Due date
          </label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={initialValues?.dueDate ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scheduledDate" className="text-sm font-medium text-text-primary">
            Scheduled date
          </label>
          <Input
            id="scheduledDate"
            name="scheduledDate"
            type="date"
            defaultValue={initialValues?.scheduledDate ?? ""}
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
