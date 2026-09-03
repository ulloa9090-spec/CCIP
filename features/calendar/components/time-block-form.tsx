"use client";

import { useActionState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult } from "@/lib/types/action-result";
import { FOCUS_CONTEXTS } from "@/lib/validation/calendar";
import type { TimeBlock } from "@/features/calendar/types";
import type { Task } from "@/features/tasks/types";
import type { Project } from "@/features/projects/types";

const initialState: ActionResult = {};

const CONTEXT_LABELS: Record<(typeof FOCUS_CONTEXTS)[number], string> = {
  deep_work: "Deep Work",
  study: "Study",
  planning: "Planning",
  family: "Family",
  exercise: "Exercise",
  admin: "Admin",
  other: "Other",
};

function toLocalInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function TimeBlockForm({
  action,
  tasks,
  projects,
  initialValues,
  submitLabel,
  onDelete,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  tasks: Task[];
  projects: Project[];
  initialValues?: Omit<Partial<TimeBlock>, "startAt" | "endAt"> & { startAt: Date; endAt: Date };
  submitLabel: string;
  onDelete?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tb-title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="tb-title" name="title" defaultValue={initialValues?.title} required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tb-startAt" className="text-sm font-medium text-text-primary">
            Start
          </label>
          <Input
            id="tb-startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValues!.startAt)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tb-endAt" className="text-sm font-medium text-text-primary">
            End
          </label>
          <Input
            id="tb-endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValues!.endAt)}
            required
          />
          {state.fieldErrors?.endAt && <p className="text-xs text-danger">{state.fieldErrors.endAt}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tb-focusContext" className="text-sm font-medium text-text-primary">
          Focus context
        </label>
        <Select name="focusContext" defaultValue={initialValues?.focusContext ?? undefined}>
          <SelectTrigger id="tb-focusContext">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {FOCUS_CONTEXTS.map((c) => (
              <SelectItem key={c} value={c}>
                {CONTEXT_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tb-taskId" className="text-sm font-medium text-text-primary">
            Task (optional)
          </label>
          <Select name="taskId" defaultValue={initialValues?.taskId ?? undefined}>
            <SelectTrigger id="tb-taskId">
              <SelectValue placeholder="Unlinked" />
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
          <label htmlFor="tb-projectId" className="text-sm font-medium text-text-primary">
            Project (optional)
          </label>
          <Select name="projectId" defaultValue={initialValues?.projectId ?? undefined}>
            <SelectTrigger id="tb-projectId">
              <SelectValue placeholder="Unlinked" />
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

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <div className="flex items-center justify-between">
        {onDelete ? (
          <button type="button" onClick={onDelete} className="text-xs font-medium text-danger hover:underline">
            Delete
          </button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
