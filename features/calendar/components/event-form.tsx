"use client";

import { useActionState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/types/action-result";
import type { CalendarEvent } from "@/features/calendar/types";

const initialState: ActionResult = {};

function toLocalInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function EventForm({
  action,
  initialValues,
  submitLabel,
  onDelete,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initialValues?: Omit<Partial<CalendarEvent>, "startAt" | "endAt"> & { startAt: Date; endAt: Date };
  submitLabel: string;
  onDelete?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="ev-title" name="title" defaultValue={initialValues?.title} required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ev-startAt" className="text-sm font-medium text-text-primary">
            Start
          </label>
          <Input
            id="ev-startAt"
            name="startAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValues!.startAt)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ev-endAt" className="text-sm font-medium text-text-primary">
            End
          </label>
          <Input
            id="ev-endAt"
            name="endAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValues!.endAt)}
            required
          />
          {state.fieldErrors?.endAt && <p className="text-xs text-danger">{state.fieldErrors.endAt}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-location" className="text-sm font-medium text-text-primary">
          Location
        </label>
        <Input id="ev-location" name="location" defaultValue={initialValues?.location ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <Textarea id="ev-notes" name="notes" defaultValue={initialValues?.notes ?? ""} />
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
