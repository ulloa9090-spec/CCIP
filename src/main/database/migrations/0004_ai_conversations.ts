import type { Migration } from './types'

/**
 * Fase 4 (Tutor Q&A): `ai_conversations` + `ai_messages` (DATA_MODEL.md
 * §25, §26). `course_id`/`document_scope_json` stay unused (NULL) until
 * Fase 5 gives conversations a real course/document scope to attach —
 * Fase 4's Tutor always searches the whole library.
 */
export const migration0004AiConversations: Migration = {
  version: 4,
  name: 'ai_conversations',
  up: `
    CREATE TABLE ai_conversations (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      document_scope_json TEXT,
      mode TEXT NOT NULL,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      source_refs_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
  `
}
