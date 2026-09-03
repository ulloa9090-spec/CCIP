"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { resolveDecision } from "@/features/decisions/actions";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function ResolveDecisionForm({ decisionId }: { decisionId: string }) {
  const boundResolve = resolveDecision.bind(null, decisionId);
  const [state, formAction, pending] = useActionState(boundResolve, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rd-actualOutcome" className="text-sm font-medium text-text-primary">
          What actually happened?
        </label>
        <Textarea id="rd-actualOutcome" name="actualOutcome" required />
        {state.fieldErrors?.actualOutcome && (
          <p className="text-xs text-danger">{state.fieldErrors.actualOutcome}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rd-lesson" className="text-sm font-medium text-text-primary">
          Lesson learned (optional)
        </label>
        <Textarea id="rd-lesson" name="lesson" />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.message && <p className="text-sm text-success">{state.message}</p>}
      <Button type="submit" loading={pending} className="self-start">
        Save Review
      </Button>
    </form>
  );
}
