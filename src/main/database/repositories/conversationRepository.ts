import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type { Conversation, ConversationMessage, MessageSource } from '../../../shared/types/tutor'

interface ConversationRow {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  role: 'user' | 'assistant'
  content: string
  source_refs_json: string | null
  created_at: string
}

function mapConversation(row: ConversationRow): Conversation {
  return { id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at }
}

function mapMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    sources: row.source_refs_json ? (JSON.parse(row.source_refs_json) as MessageSource[]) : [],
    createdAt: row.created_at
  }
}

const TITLE_MAX_LENGTH = 60

export class ConversationRepository {
  constructor(private readonly db: Database) {}

  create(): Conversation {
    const now = new Date().toISOString()
    const id = ulid()
    this.db
      .prepare(
        `INSERT INTO ai_conversations (id, course_id, document_scope_json, mode, title, created_at, updated_at)
         VALUES (?, NULL, NULL, 'tutor', NULL, ?, ?)`
      )
      .run(id, now, now)
    return { id, title: null, createdAt: now, updatedAt: now }
  }

  getLatest(): Conversation | null {
    const row = this.db
      .prepare('SELECT * FROM ai_conversations ORDER BY updated_at DESC, id DESC LIMIT 1')
      .get() as ConversationRow | undefined
    return row ? mapConversation(row) : null
  }

  getById(id: string): Conversation | null {
    const row = this.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(id) as
      ConversationRow | undefined
    return row ? mapConversation(row) : null
  }

  getMessages(conversationId: string): ConversationMessage[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC'
      )
      .all(conversationId) as MessageRow[]
    return rows.map(mapMessage)
  }

  addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    sources: MessageSource[] = []
  ): ConversationMessage {
    const now = new Date().toISOString()
    const id = ulid()
    this.db
      .prepare(
        `INSERT INTO ai_messages (id, conversation_id, role, content, source_refs_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, conversationId, role, content, sources.length ? JSON.stringify(sources) : null, now)

    this.db
      .prepare('UPDATE ai_conversations SET updated_at = ? WHERE id = ?')
      .run(now, conversationId)

    // First user message becomes the conversation's title, like most chat UIs.
    if (role === 'user') {
      const conversation = this.getById(conversationId)
      if (conversation && !conversation.title) {
        const title =
          content.length > TITLE_MAX_LENGTH ? `${content.slice(0, TITLE_MAX_LENGTH)}…` : content
        this.db
          .prepare('UPDATE ai_conversations SET title = ? WHERE id = ?')
          .run(title, conversationId)
      }
    }

    return { id, role, content, sources, createdAt: now }
  }
}
