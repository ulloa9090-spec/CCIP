"use server";

import { createClient } from "@/lib/supabase/server";

async function requireUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await requireUserId(supabase);

  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const userId = await requireUserId(supabase);

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}
