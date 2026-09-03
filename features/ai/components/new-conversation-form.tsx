"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { startFreeformThread } from "@/features/ai/actions";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function NewConversationForm() {
  const [state, formAction, pending] = useActionState(startFreeformThread, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Textarea name="content" placeholder="Ask Atlas anything about your goals, tasks, or habits..." required rows={2} />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending} className="self-start">
        Start Conversation
      </Button>
    </form>
  );
}
