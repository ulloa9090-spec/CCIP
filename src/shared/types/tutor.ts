export interface MessageSource {
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
  heading: string | null
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Always empty for user messages; the retrieved chunks behind an assistant answer. */
  sources: MessageSource[]
  createdAt: string
}

export interface Conversation {
  id: string
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[]
}

/**
 * Pushed over IPC while an answer streams in (AI generation doesn't fit
 * `ipcMain.handle`'s one-shot request/response shape — see
 * documents:progress for the same pattern used in Fase 2/3).
 */
export type TutorEvent =
  | { type: 'chunk'; conversationId: string; messageId: string; delta: string }
  | {
      type: 'done'
      conversationId: string
      messageId: string
      content: string
      sources: MessageSource[]
    }
  | { type: 'error'; conversationId: string; messageId: string; errorMessage: string }
