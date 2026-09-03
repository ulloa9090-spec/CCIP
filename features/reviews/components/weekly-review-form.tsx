"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { completeWeeklyReview, saveWeeklyReviewDraft } from "@/features/reviews/actions";
import type { WeeklyReview } from "@/features/reviews/types";
import type { Task } from "@/features/tasks/types";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

const FIELDS: { name: keyof WeeklyReview; label: string; placeholder?: string }[] = [
  { name: "reflectionCompleted", label: "What did you complete this week?" },
  { name: "reflectionMissed", label: "What did you miss or not get to?" },
  { name: "reflectionWhy", label: "Why did you miss it?" },
  { name: "reflectionProgress", label: "What progress did you make toward your goals?" },
  { name: "reflectionTimeWasted", label: "Where did time get wasted?" },
  { name: "reflectionStopDoing", label: "What should you stop doing?" },
  { name: "reflectionLearned", label: "What did you learn?" },
];

export function WeeklyReviewForm({ review, candidateTasks }: { review: WeeklyReview; candidateTasks: Task[] }) {
  const [taskId, setTaskId] = useState(review.nextWeekMioTaskId ?? "");
  const [draftState, draftAction, draftPending] = useActionState(
    saveWeeklyReviewDraft.bind(null, review.weekStartDate),
    initialState,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeWeeklyReview.bind(null, review.weekStartDate),
    initialState,
  );

  return (
    <form className="flex flex-col gap-4">
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label htmlFor={`wr-${field.name}`} className="text-sm font-medium text-text-primary">
            {field.label}
          </label>
          <Textarea
            id={`wr-${field.name}`}
            name={field.name}
            defaultValue={(review[field.name] as string | null) ?? ""}
          />
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wr-nextWeekMio" className="text-sm font-medium text-text-primary">
          Next week&apos;s Most Important Outcome (optional)
        </label>
        <Select value={taskId || "none"} onValueChange={(v) => setTaskId(v === "none" ? "" : v)}>
          <SelectTrigger id="wr-nextWeekMio">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {candidateTasks.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="nextWeekMioTaskId" value={taskId} />
      </div>

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
