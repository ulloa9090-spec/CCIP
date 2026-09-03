"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateAiProvider } from "@/features/settings/actions";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult = {};

export function AiProviderForm({ currentProvider }: { currentProvider: string | null }) {
  const [provider, setProvider] = useState(currentProvider ?? "default");
  const [state, formAction, pending] = useActionState(updateAiProvider, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Select value={provider} onValueChange={setProvider}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Use deployment default</SelectItem>
          <SelectItem value="anthropic">Anthropic</SelectItem>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="local">Local model (not available yet)</SelectItem>
        </SelectContent>
      </Select>
      <input type="hidden" name="aiProvider" value={provider} />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.message && <p className="text-xs text-success">{state.message}</p>}
      <Button type="submit" size="sm" loading={pending} className="self-start">
        Save
      </Button>
    </form>
  );
}
