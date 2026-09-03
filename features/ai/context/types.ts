/** Matches `ai_threads.context_type`'s check constraint exactly — the one
 * enum every context builder, thread, and the AI Coach UI agree on. */
export type AiContextType =
  | "morning_brief"
  | "evening_review"
  | "weekly_coach"
  | "planning"
  | "decision_assistant"
  | "freeform";

/**
 * blueprint §M.2 — what every `ContextBuilder` returns: `summary` is
 * structured data the UI can render as "context chips" (what's in scope,
 * shown to the user before they trust a response), `promptText` is the
 * same information flattened into the text block actually sent to the
 * model. The two are built from one pass over the same data so they can
 * never drift apart.
 */
export interface ContextPayload {
  contextType: AiContextType;
  summary: Record<string, unknown>;
  promptText: string;
}
