import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "./types";

const SELECT = "id, type, title, body, link, source, read_at, created_at";

interface NotificationRow {
  id: string;
  type: Notification["type"];
  title: string;
  body: string | null;
  link: string | null;
  source: string | null;
  read_at: string | null;
  created_at: string;
}

function mapRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    source: row.source,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function getNotifications(limit = 20): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data ?? []) as NotificationRow[]).map(mapRow);
}
