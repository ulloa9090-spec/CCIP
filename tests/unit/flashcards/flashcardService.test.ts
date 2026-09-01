import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { FlashcardRepository } from '../../../src/main/database/repositories/flashcardRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { upsertConcept } from '../../../src/main/database/repositories/conceptRepository'
import { RetrievalService } from '../../../src/main/retrieval/retrievalService'
import { FlashcardService } from '../../../src/main/flashcards/flashcardService'
import { AppError } from '../../../src/shared/types/errors'
import type { AIProvider, EmbeddingProvider, StreamTextChunk } from '../../../src/shared/types/ai'

function fakeEmbeddings(): EmbeddingProvider {
  return { id: 'fake', dimensions: 2, embed: async (texts) => texts.map(() => [1, 0]) }
}

function fakeAIProvider(result: unknown): AIProvider {
  return {
    id: 'fake-ai',
    testConnection: async () => true,
    generateText: async () => 'not used',
    generateStructured: async <T>() => result as T,
    streamText(): AsyncIterable<StreamTextChunk> {
      throw new Error('not used in these tests')
    }
  }
}

const validSet = {
  flashcards: [
    { front: 'Q1', back: 'A1', concept: 'Concepto A' },
    { front: 'Q2', back: 'A2' },
    { front: 'Q3', back: 'A3', hint: 'pista' },
    { front: 'Q4', back: 'A4' },
    { front: 'Q5', back: 'A5' }
  ]
}

let db: Database.Database
let documents: DocumentRepository
let courses: CourseRepository
let chunks: DocumentChunkRepository
let courseId: string
let documentId: string

function buildService(ai: AIProvider): FlashcardService {
  return new FlashcardService(
    courses,
    documents,
    new FlashcardRepository(db),
    new RetrievalService(chunks, fakeEmbeddings()),
    ai
  )
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
  chunks = new DocumentChunkRepository(db)
  documentId = documents.create({
    title: 'Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
  documents.replacePages(documentId, [
    { pageNumber: 1, text: 'Contenido de prueba.', heading: null }
  ])
  courseId = courses.create({
    objective: 'Aprender',
    documentIds: [documentId],
    targetDate: null,
    dailyMinutes: 30,
    structure: {
      title: 'Curso',
      modules: [
        {
          title: 'M1',
          lessons: [{ title: 'L1', type: 'lesson', estimatedMinutes: 10, summary: 'r' }]
        }
      ]
    }
  }).id
})

describe('FlashcardService', () => {
  it('generate() persists a new deck, links concepts, and returns the cards', async () => {
    const service = buildService(fakeAIProvider(validSet))

    const created = await service.generate(courseId)

    expect(created).toHaveLength(5)
    expect(created[0].front).toBe('Q1')
    const conceptId = upsertConcept(db, 'Concepto A')
    expect(conceptId).toBeTruthy()
  })

  it('generate() attaches a real citation from retrieval when a matching chunk exists', async () => {
    chunks.replaceChunks(documentId, [
      { text: 'Q1', pageStart: 3, pageEnd: 3, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])
    const service = buildService(fakeAIProvider(validSet))

    const created = await service.generate(courseId)

    expect(created[0].sourceRefs).toEqual([
      { documentId, documentTitle: 'Manual', pageStart: 3, pageEnd: 3 }
    ])
  })

  it('generate() rejects with NOT_FOUND for an unknown course', async () => {
    const service = buildService(fakeAIProvider(validSet))
    await expect(service.generate('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('generate() re-validates the AI response with Zod and rejects a malformed set without persisting', async () => {
    const malformed = { flashcards: [] } // needs at least 5
    const service = buildService(fakeAIProvider(malformed))

    await expect(service.generate(courseId)).rejects.toMatchObject({ code: 'AI_INVALID_STRUCTURE' })
    expect(service.listDecks()).toEqual([])
  })

  it('generate() passes through an AppError raised by the AI provider unchanged', async () => {
    const failingAI: AIProvider = {
      ...fakeAIProvider(validSet),
      generateStructured: async () => {
        throw new AppError({ code: 'AI_KEY_NOT_CONFIGURED', userMessage: 'Falta la clave.' })
      }
    }
    const service = buildService(failingAI)

    await expect(service.generate(courseId)).rejects.toMatchObject({
      code: 'AI_KEY_NOT_CONFIGURED'
    })
  })

  it('generate() appends to an existing deck rather than replacing it', async () => {
    const service = buildService(fakeAIProvider(validSet))
    await service.generate(courseId)
    await service.generate(courseId)

    expect(service.getDeck(courseId)).toHaveLength(10)
  })

  it('createManual() rejects an empty front or back', () => {
    const service = buildService(fakeAIProvider(validSet))
    expect(() => service.createManual({ courseId, front: '  ', back: 'A' })).toThrow(AppError)
    expect(() => service.createManual({ courseId, front: 'Q', back: '' })).toThrow(AppError)
  })

  it('createManual() rejects an unknown course with NOT_FOUND', () => {
    const service = buildService(fakeAIProvider(validSet))
    expect.assertions(1)
    try {
      service.createManual({ courseId: 'missing', front: 'Q', back: 'A' })
    } catch (error) {
      expect(error).toMatchObject({ code: 'NOT_FOUND' })
    }
  })

  it('createManual() persists a manual card', () => {
    const service = buildService(fakeAIProvider(validSet))
    const card = service.createManual({ courseId, front: 'Q', back: 'A' })
    expect(service.getDeck(courseId).map((c) => c.id)).toContain(card.id)
  })

  it('listDecks() only includes courses with at least one card', async () => {
    const service = buildService(fakeAIProvider(validSet))
    expect(service.listDecks()).toEqual([])

    await service.generate(courseId)
    const decks = service.listDecks()
    expect(decks).toHaveLength(1)
    expect(decks[0]).toMatchObject({ courseId, totalCards: 5, dueCards: 5 })
  })

  it('getReviewQueue() only returns cards that are due', async () => {
    const service = buildService(fakeAIProvider(validSet))
    const created = await service.generate(courseId)

    service.submitReview(created[0].id, 'easy')

    const queue = service.getReviewQueue(courseId)
    expect(queue.map((c) => c.id)).not.toContain(created[0].id)
    expect(queue).toHaveLength(4)
  })

  it('getDeck()/getReviewQueue() reject an unknown course with NOT_FOUND', () => {
    const service = buildService(fakeAIProvider(validSet))
    expect.assertions(2)
    try {
      service.getDeck('missing')
    } catch (error) {
      expect(error).toMatchObject({ code: 'NOT_FOUND' })
    }
    try {
      service.getReviewQueue('missing')
    } catch (error) {
      expect(error).toMatchObject({ code: 'NOT_FOUND' })
    }
  })

  it('submitReview() computes the correct schedule and persists a review row', async () => {
    const service = buildService(fakeAIProvider(validSet))
    const created = await service.generate(courseId)

    const outcome = service.submitReview(created[0].id, 'good')

    expect(outcome.intervalDays).toBe(1)
    expect(outcome.rating).toBe('good')

    // A second 'good' review should progress the interval to 6 days.
    const second = service.submitReview(created[0].id, 'good')
    expect(second.intervalDays).toBe(6)
  })

  it('submitReview() rejects an unknown flashcard with NOT_FOUND', () => {
    const service = buildService(fakeAIProvider(validSet))
    expect.assertions(1)
    try {
      service.submitReview('missing', 'good')
    } catch (error) {
      expect(error).toMatchObject({ code: 'NOT_FOUND' })
    }
  })
})
