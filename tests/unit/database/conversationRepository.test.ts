import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { ConversationRepository } from '../../../src/main/database/repositories/conversationRepository'

let db: Database.Database
let repository: ConversationRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  repository = new ConversationRepository(db)
})

describe('ConversationRepository', () => {
  it('creates a conversation with no title yet', () => {
    const conversation = repository.create()
    expect(conversation.title).toBeNull()
    expect(repository.getById(conversation.id)).toEqual(conversation)
  })

  it('getLatest returns null when there are no conversations', () => {
    expect(repository.getLatest()).toBeNull()
  })

  it('getLatest returns the most recently updated conversation', async () => {
    const first = repository.create()
    await new Promise((resolve) => setTimeout(resolve, 2))
    const second = repository.create()

    expect(repository.getLatest()?.id).toBe(second.id)

    // Touching the first one again makes it the latest.
    await new Promise((resolve) => setTimeout(resolve, 2))
    repository.addMessage(first.id, 'user', 'hola')
    expect(repository.getLatest()?.id).toBe(first.id)
  })

  it('titles the conversation from the first user message only', () => {
    const conversation = repository.create()
    repository.addMessage(conversation.id, 'user', '¿Qué es un change order?')
    repository.addMessage(conversation.id, 'assistant', 'Es una modificación al contrato...')
    repository.addMessage(conversation.id, 'user', 'una segunda pregunta')

    expect(repository.getById(conversation.id)?.title).toBe('¿Qué es un change order?')
  })

  it('truncates a long first message into the title', () => {
    const conversation = repository.create()
    const longQuestion = 'a'.repeat(100)
    repository.addMessage(conversation.id, 'user', longQuestion)

    const title = repository.getById(conversation.id)?.title
    expect(title?.length).toBeLessThan(longQuestion.length)
    expect(title?.endsWith('…')).toBe(true)
  })

  it('persists and returns sources for assistant messages, empty for user messages', () => {
    const conversation = repository.create()
    repository.addMessage(conversation.id, 'user', 'pregunta')
    repository.addMessage(conversation.id, 'assistant', 'respuesta', [
      {
        documentId: 'doc-1',
        documentTitle: 'Manual',
        pageStart: 4,
        pageEnd: 5,
        heading: 'Concrete'
      }
    ])

    const messages = repository.getMessages(conversation.id)
    expect(messages).toHaveLength(2)
    expect(messages[0].sources).toEqual([])
    expect(messages[1].sources).toEqual([
      {
        documentId: 'doc-1',
        documentTitle: 'Manual',
        pageStart: 4,
        pageEnd: 5,
        heading: 'Concrete'
      }
    ])
  })

  it('orders messages chronologically', () => {
    const conversation = repository.create()
    repository.addMessage(conversation.id, 'user', 'primera')
    repository.addMessage(conversation.id, 'assistant', 'segunda')
    repository.addMessage(conversation.id, 'user', 'tercera')

    expect(repository.getMessages(conversation.id).map((m) => m.content)).toEqual([
      'primera',
      'segunda',
      'tercera'
    ])
  })
})
