"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import { JOURNAL_CATEGORIES } from "@/lib/validation/journal";
import type { JournalEntry } from "@/features/journal/types";
import type { Goal } from "@/features/goals/types";
import type { Project } from "@/features/projects/types";
import type { Task } from "@/features/tasks/types";
import type { Decision } from "@/features/decisions/types";

const initialState: ActionResult = {};

const CATEGORY_LABELS: Record<(typeof JOURNAL_CATEGORIES)[number], string> = {
  daily_reflection: "Daily Reflection",
  learning: "Learning",
  win: "Win",
  problem: "Problem",
  observation: "Observation",
  free_note: "Free Note",
};

export function JournalEntryForm({
  action,
  goals,
  projects,
  tasks,
  decisions,
  initialValues,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  goals: Goal[];
  projects: Project[];
  tasks: Task[];
  decisions: Decision[];
  initialValues?: Partial<JournalEntry>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="je-category" className="text-sm font-medium text-text-primary">
          Category
        </label>
        <Select name="category" defaultValue={initialValues?.category ?? "free_note"}>
          <SelectTrigger id="je-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOURNAL_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="je-body" className="text-sm font-medium text-text-primary">
          Entry
        </label>
        <Textarea id="je-body" name="body" rows={6} defaultValue={initialValues?.body} autoFocus required />
        {state.fieldErrors?.body && <p className="text-xs text-danger">{state.fieldErrors.body}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="je-goalId" className="text-sm font-medium text-text-primary">
            Goal (optional)
          </label>
          <Select name="goalId" defaultValue={initialValues?.goalId ?? undefined}>
            <SelectTrigger id="je-goalId">
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
          <label htmlFor="je-projectId" className="text-sm font-medium text-text-primary">
            Project (optional)
          </label>
          <Select name="projectId" defaultValue={initialValues?.projectId ?? undefined}>
            <SelectTrigger id="je-projectId">
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="je-taskId" className="text-sm font-medium text-text-primary">
            Task (optional)
          </label>
          <Select name="taskId" defaultValue={initialValues?.taskId ?? undefined}>
            <SelectTrigger id="je-taskId">
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="je-decisionId" className="text-sm font-medium text-text-primary">
            Decision (optional)
          </label>
          <Select name="decisionId" defaultValue={initialValues?.decisionId ?? undefined}>
            <SelectTrigger id="je-decisionId">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              {decisions.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
