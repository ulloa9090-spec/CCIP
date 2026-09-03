"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/features/ai/actions";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function ChatInput({ threadId }: { threadId: string }) {
  const boundSend = sendChatMessage.bind(null, threadId);
  const [state, formAction, pending] = useActionState(boundSend, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2 border-t border-border p-4"
    >
      <Textarea name="content" placeholder="Ask a follow-up..." required rows={2} />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="sm" loading={pending} className="self-end">
        Send
      </Button>
    </form>
  );
}
