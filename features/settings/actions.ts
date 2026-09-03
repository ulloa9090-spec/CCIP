"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AI_PROVIDER_NAMES } from "@/lib/ai/provider";
import type { ActionResult } from "@/lib/types/action-result";

/** `aiProvider` of "default" clears the per-user override (falls back to
 * the deployment's `AI_PROVIDER` env var — see `lib/ai/provider.ts`). */
export async function updateAiProvider(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = String(formData.get("aiProvider") ?? "default");
  const value = raw === "default" ? null : raw;
  if (value !== null && !(AI_PROVIDER_NAMES as string[]).includes(value)) {
    return { error: "Invalid provider." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("settings").update({ ai_provider: value }).eq("user_id", user.id);
  if (error) return { error: "Couldn't save. Try again." };

  revalidatePath("/settings");
  return { message: "Saved." };
}
