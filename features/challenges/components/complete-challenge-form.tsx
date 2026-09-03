"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { abandonChallenge, completeChallenge } from "@/features/challenges/actions";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function CompleteChallengeForm({ challengeId }: { challengeId: string }) {
  const boundComplete = completeChallenge.bind(null, challengeId);
  const [state, formAction, pending] = useActionState(boundComplete, initialState);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cc-finalScore" className="text-sm font-medium text-text-primary">
            Final score (0–100, optional)
          </label>
          <Input id="cc-finalScore" name="finalScore" type="number" min={0} max={100} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cc-reflections" className="text-sm font-medium text-text-primary">
            Reflections
          </label>
          <Textarea id="cc-reflections" name="reflections" placeholder="What did you learn? What's next?" />
        </div>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.message && <p className="text-sm text-success">{state.message}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" loading={pending}>
            Complete Challenge
          </Button>
          <button
            type="button"
            onClick={() => abandonChallenge(challengeId)}
            className="text-xs font-medium text-danger hover:underline"
          >
            Abandon
          </button>
        </div>
      </form>
    </div>
  );
}
