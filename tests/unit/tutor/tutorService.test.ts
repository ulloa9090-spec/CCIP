import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { ConversationRepository } from '../../../src/main/database/repositories/conversationRepository'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'
import { DiagnosticsRepository } from '../../../src/main/database/repositories/diagnosticsRepository'
import { SettingsRepository } from '../../../src/main/database/repositories/settingsRepository'
import { RetrievalService } from '../../../src/main/retrieval/retrievalService'
import { TutorService, INSUFFICIENT_EVIDENCE_MESSAGE } from '../../../src/main/tutor/tutorService'
import type { AIProvider, EmbeddingProvider, StreamTextChunk } from '../../../src/shared/types/ai'
import type { TutorEvent } from '../../../src/shared/types/tutor'

function fakeEmbeddings(): EmbeddingProvider {
  return { id: 'fake', dimensions: 2, embed: async (texts) => texts.map(() => [1, 0]) }
}

function scriptedAIProvider(deltas: string[], options: { throwAfter?: number } = {}): AIProvider {
  return {
    id: 'fake-ai',
    testConnection: async () => true,
    generateText: async () => deltas.join(''),
    generateStructured: async () => {
      throw new Error('not used in these tests')
    },
    async *streamText(): AsyncIterable<StreamTextChunk> {
      for (let i = 0; i < deltas.length; i++) {
        if (options.throwAfter === i) throw new Error('stream broke')
        yield { delta: deltas[i], done: i === deltas.length - 1 }
      }
    }
  }
}

async function collect(iter: AsyncGenerator<TutorEvent>): Promise<TutorEvent[]> {
  const events: TutorEvent[] = []
  for await (const event of iter) events.push(event)
  return events
}

let db: Database.Database
let conversations: ConversationRepository
let documents: DocumentRepository
let chunks: DocumentChunkRepository
let jobs: ProcessingJobRepository
let diagnostics: DiagnosticsRepository
let settings: SettingsRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  conversations = new ConversationRepository(db)
  documents = new DocumentRepository(db)
  chunks = new DocumentChunkRepository(db)
  jobs = new ProcessingJobRepository(db)
  diagnostics = new DiagnosticsRepository(db)
  settings = new SettingsRepository(db)
})

describe('TutorService', () => {
  it('returns the fixed insufficient-evidence message without calling the AI when the library has no chunks', async () => {
    const conversation = conversations.create()
    const retrieval = new RetrievalService(chunks, fakeEmbeddings())
    let aiCalled = false
    const ai: AIProvider = {
      ...scriptedAIProvider(['should not be used']),
      streamText: async function* () {
        aiCalled = true
        yield { delta: 'x', done: true }
      }
    }
    const tutor = new TutorService(
      conversations,
      retrieval,
      ai,
      diagnostics,
      documents,
      chunks,
      jobs,
      settings
    )

    const events = await collect(tutor.ask(conversation.id, '¿Qué es un change order?'))

    expect(aiCalled).toBe(false)
    expect(events).toEqual([
      {
        type: 'done',
        conversationId: conversation.id,
        messageId: expect.any(String),
        content: INSUFFICIENT_EVIDENCE_MESSAGE,
        sources: [],
        requestId: expect.any(String),
        abstentionReason: 'NO_INDEXED_DOCUMENTS'
      }
    ])

    const persisted = conversations.getMessages(conversation.id)
    expect(persisted.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(persisted[1].content).toBe(INSUFFICIENT_EVIDENCE_MESSAGE)
  })

  it('streams a grounded answer and attaches deduplicated citations from the retrieved chunks', async () => {
    const document = documents.create({
      title: 'Michigan Builder Manual',
      originalFilename: 'manual.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h1'
    })
    chunks.replaceChunks(document.id, [
      {
        text: 'A change order modifies the original contract.',
        pageStart: 82,
        pageEnd: 82,
        heading: 'Contracts',
        tokenCount: 10,
        embedding: [1, 0]
      },
      {
        text: 'Change orders must be documented in writing.',
        pageStart: 82,
        pageEnd: 82,
        heading: 'Contracts',
        tokenCount: 10,
        embedding: [1, 0]
      }
    ])
    const conversation = conversations.create()
    const retrieval = new RetrievalService(chunks, fakeEmbeddings())
    const ai = scriptedAIProvider(['A change ', 'order is a written modification.'])
    const tutor = new TutorService(
      conversations,
      retrieval,
      ai,
      diagnostics,
      documents,
      chunks,
      jobs,
      settings
    )

    const events = await collect(tutor.ask(conversation.id, '¿Qué es un change order?'))

    const chunkEvents = events.filter((e) => e.type === 'chunk')
    expect(chunkEvents.map((e) => (e.type === 'chunk' ? e.delta : ''))).toEqual([
      'A change ',
      'order is a written modification.'
    ])

    const doneEvent = events.at(-1)
    expect(doneEvent).toMatchObject({
      type: 'done',
      content: 'A change order is a written modification.'
    })
    if (doneEvent?.type === 'done') {
      // Both chunks are on the same page → one deduplicated citation.
      expect(doneEvent.sources).toEqual([
        {
          documentId: document.id,
          documentTitle: 'Michigan Builder Manual',
          pageStart: 82,
          pageEnd: 82,
          heading: 'Contracts'
        }
      ])

      // Fase 13: the same requestId the renderer got back is a real,
      // fully-traced diagnostic_requests row with a sensible event timeline.
      const detail = diagnostics.getRequestDetail(doneEvent.requestId)
      expect(detail).toMatchObject({
        feature: 'tutor',
        status: 'success',
        abstentionReason: null,
        question: '¿Qué es un change order?'
      })
      expect(detail?.events.map((e) => e.eventType)).toEqual([
        'QUESTION_RECEIVED',
        'RETRIEVAL_STARTED',
        'RETRIEVAL_COMPLETED',
        'AI_REQUEST_STARTED',
        'AI_FIRST_TOKEN',
        'AI_REQUEST_COMPLETED',
        'RESPONSE_RENDERED'
      ])
    }

    const persisted = conversations.getMessages(conversation.id)
    expect(persisted[1].content).toBe('A change order is a written modification.')
    expect(persisted[1].sources).toHaveLength(1)
  })

  it('attaches no sources when the model itself decides evidence is insufficient', async () => {
    const document = documents.create({
      title: 'Unrelated Manual',
      originalFilename: 'x.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    })
    chunks.replaceChunks(document.id, [
      {
        text: 'Something else entirely.',
        pageStart: 1,
        pageEnd: 1,
        heading: null,
        tokenCount: 5,
        embedding: [1, 0]
      }
    ])
    const conversation = conversations.create()
    const retrieval = new RetrievalService(chunks, fakeEmbeddings())
    const ai = scriptedAIProvider([INSUFFICIENT_EVIDENCE_MESSAGE])
    const tutor = new TutorService(
      conversations,
      retrieval,
      ai,
      diagnostics,
      documents,
      chunks,
      jobs,
      settings
    )

    const events = await collect(tutor.ask(conversation.id, 'pregunta rara'))
    const doneEvent = events.at(-1)

    expect(doneEvent).toMatchObject({ type: 'done', sources: [] })
  })

  it('yields an error event and does not persist an assistant message when the stream fails', async () => {
    const document = documents.create({
      title: 'Doc',
      originalFilename: 'x.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h3'
    })
    chunks.replaceChunks(document.id, [
      { text: 'algo', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])
    const conversation = conversations.create()
    const retrieval = new RetrievalService(chunks, fakeEmbeddings())
    const ai = scriptedAIProvider(['parcial'], { throwAfter: 0 })
    const tutor = new TutorService(
      conversations,
      retrieval,
      ai,
      diagnostics,
      documents,
      chunks,
      jobs,
      settings
    )

    const events = await collect(tutor.ask(conversation.id, 'pregunta'))

    const errorEvent = events.at(-1)
    expect(errorEvent).toMatchObject({ type: 'error' })
    expect(conversations.getMessages(conversation.id).map((m) => m.role)).toEqual(['user'])

    if (errorEvent?.type === 'error') {
      const detail = diagnostics.getRequestDetail(errorEvent.requestId)
      expect(detail).toMatchObject({ status: 'error', abstentionReason: 'AI_PROVIDER_ERROR' })
      expect(detail?.events.map((e) => e.eventType)).toContain('REQUEST_ABORTED')
    }
  })
})
