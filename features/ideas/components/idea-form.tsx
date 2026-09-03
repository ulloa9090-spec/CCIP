"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/types/action-result";
import type { Idea } from "@/features/ideas/types";

const initialState: ActionResult = {};

export function IdeaForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  initialValues?: Partial<Idea>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="idea-title" className="text-sm font-medium text-text-primary">
          Title
        </label>
        <Input id="idea-title" name="title" defaultValue={initialValues?.title} autoFocus required />
        {state.fieldErrors?.title && <p className="text-xs text-danger">{state.fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="idea-description" className="text-sm font-medium text-text-primary">
          Description
        </label>
        <Textarea id="idea-description" name="description" defaultValue={initialValues?.description ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="idea-category" className="text-sm font-medium text-text-primary">
          Category
        </label>
        <Input id="idea-category" name="category" defaultValue={initialValues?.category ?? ""} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="idea-impact" className="text-sm font-medium text-text-primary">
            Impact (1-5)
          </label>
          <Input id="idea-impact" name="impact" type="number" min={1} max={5} defaultValue={initialValues?.impact ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="idea-effort" className="text-sm font-medium text-text-primary">
            Effort (1-5)
          </label>
          <Input id="idea-effort" name="effort" type="number" min={1} max={5} defaultValue={initialValues?.effort ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="idea-urgency" className="text-sm font-medium text-text-primary">
            Urgency (1-5)
          </label>
          <Input
            id="idea-urgency"
            name="urgency"
            type="number"
            min={1}
            max={5}
            defaultValue={initialValues?.urgency ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="idea-reviewDate" className="text-sm font-medium text-text-primary">
          Review date (optional)
        </label>
        <Input id="idea-reviewDate" name="reviewDate" type="date" defaultValue={initialValues?.reviewDate ?? ""} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="idea-notes" className="text-sm font-medium text-text-primary">
          Notes
        </label>
        <Textarea id="idea-notes" name="notes" defaultValue={initialValues?.notes ?? ""} />
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}

      <Button type="submit" loading={pending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
