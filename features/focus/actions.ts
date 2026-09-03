"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { focusSessionSchema, type FocusSessionInput } from "@/lib/validation/focus";

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export type LogFocusSessionResult = { status: "ok" } | { status: "error" };

/** The timer itself runs entirely client-side (ADR 0008) — this is the one
 * write, called when the user finishes or saves a partial session, with the
 * actual elapsed minutes already computed client-side. */
export async function logFocusSession(input: FocusSessionInput): Promise<LogFocusSessionResult> {
  const parsed = focusSessionSchema.safeParse(input);
  if (!parsed.success) return { status: "error" };

  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("focus_sessions").insert({
    user_id: userId,
    task_id: parsed.data.taskId || null,
    project_id: parsed.data.projectId || null,
    context: parsed.data.context || null,
    planned_minutes: parsed.data.plannedMinutes ?? null,
    actual_minutes: parsed.data.actualMinutes,
    started_at: parsed.data.startedAt,
    ended_at: new Date().toISOString(),
    note: parsed.data.note || null,
  });

  if (error) return { status: "error" };

  revalidatePath("/focus");
  revalidatePath("/today");
  revalidatePath("/dashboard");
  return { status: "ok" };
}
