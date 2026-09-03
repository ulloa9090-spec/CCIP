"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { completeMonthlyReview, saveMonthlyReviewDraft } from "@/features/reviews/actions";
import type { MonthlyReview } from "@/features/reviews/types";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

const FIELDS: { name: keyof MonthlyReview; label: string }[] = [
  { name: "wins", label: "Wins this month" },
  { name: "failures", label: "Failures or setbacks" },
  { name: "lessons", label: "Lessons learned" },
  { name: "nextMonthPriorities", label: "Priorities for next month" },
];

export function MonthlyReviewForm({ review }: { review: MonthlyReview }) {
  const [draftState, draftAction, draftPending] = useActionState(
    saveMonthlyReviewDraft.bind(null, review.month),
    initialState,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeMonthlyReview.bind(null, review.month),
    initialState,
  );

  return (
    <form className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label htmlFor={`mr-${field.name}`} className="text-sm font-medium text-text-primary">
            {field.label}
          </label>
          <Textarea
            id={`mr-${field.name}`}
            name={field.name}
            defaultValue={(review[field.name] as string | null) ?? ""}
          />
        </div>
      ))}

      {(draftState.error || completeState.error) && (
        <p className="text-sm text-danger">{draftState.error || completeState.error}</p>
      )}
      {draftState.message && <p className="text-sm text-success">{draftState.message}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" formAction={draftAction} variant="secondary" loading={draftPending}>
          Save Draft
        </Button>
        <Button type="submit" formAction={completeAction} loading={completePending}>
          Complete Review
        </Button>
      </div>
    </form>
  );
}
