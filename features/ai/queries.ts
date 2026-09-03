import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiContextType, AiInsight, AiInsightPayload, AiMessageRecord, AiThread } from "./types";

interface ThreadRow {
  id: string;
  title: string;
  context_type: AiContextType;
  archived: boolean;
  created_at: string;
}

function mapThread(row: ThreadRow): AiThread {
  return { id: row.id, title: row.title, contextType: row.context_type, archived: row.archived, createdAt: row.created_at };
}

export async function getThreads(options?: { contextType?: AiContextType }): Promise<AiThread[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_threads")
    .select("id, title, context_type, archived, created_at")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (options?.contextType) query = query.eq("context_type", options.contextType);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ThreadRow[]).map(mapThread);
}

export async function getThreadById(id: string): Promise<AiThread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_threads")
    .select("id, title, context_type, archived, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapThread(data as ThreadRow) : null;
}

/** The most recent thread of a given context type created since `since`
 * (an ISO date) — used to reuse today's Morning Brief/Evening Review
 * thread instead of creating a new one on every visit, same "create or
 * reuse" pattern `startOrGetWeeklyReview` established in Phase 9. */
export async function getRecentThreadForContext(contextType: AiContextType, since: string): Promise<AiThread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_threads")
    .select("id, title, context_type, archived, created_at")
    .eq("context_type", contextType)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapThread(data as ThreadRow) : null;
}

interface MessageRow {
  id: string;
  thread_id: string;
  role: AiMessageRecord["role"];
  content: string;
  created_at: string;
}

export async function getMessages(threadId: string): Promise<AiMessageRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, thread_id, role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

interface InsightRow {
  id: string;
  user_id: string;
  thread_id: string | null;
  type: AiInsight["type"];
  payload: AiInsightPayload;
  status: AiInsight["status"];
  resolved_at: string | null;
  created_at: string;
}

function mapInsight(row: InsightRow): AiInsight {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    type: row.type,
    payload: row.payload,
    status: row.status,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export async function getInsightsForThread(threadId: string): Promise<AiInsight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_insights")
    .select("id, user_id, thread_id, type, payload, status, resolved_at, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as InsightRow[]).map(mapInsight);
}

export async function getInsightById(id: string): Promise<AiInsight | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_insights")
    .select("id, user_id, thread_id, type, payload, status, resolved_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapInsight(data as InsightRow) : null;
}
