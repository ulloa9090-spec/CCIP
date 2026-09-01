import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { ConceptRepository } from '../../../src/main/database/repositories/conceptRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { RetrievalService } from '../../../src/main/retrieval/retrievalService'
import { CourseService } from '../../../src/main/courses/courseService'
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

const validStructure = {
  title: 'Curso generado',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [{ title: 'Lección 1', type: 'lesson', estimatedMinutes: 15, summary: 'Resumen' }]
    }
  ]
}

let db: Database.Database
let documents: DocumentRepository
let courses: CourseRepository
let chunks: DocumentChunkRepository
let documentId: string

function buildService(ai: AIProvider): CourseService {
  return new CourseService(
    documents,
    courses,
    new ConceptRepository(db),
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
    title: 'Michigan Builder Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
  documents.replacePages(documentId, [
    { pageNumber: 1, text: 'Concrete is a composite material.', heading: 'Concrete Basics' }
  ])
})

describe('CourseService', () => {
  it('generates and persists a course from a valid AI-structured response', async () => {
    const service = buildService(fakeAIProvider(validStructure))

    const course = await service.create({
      objective: 'Aprender concreto',
      documentIds: [documentId],
      durationDays: 10,
      dailyMinutes: 20,
      style: 'equilibrado'
    })

    expect(course.title).toBe('Curso generado')
    expect(course.modules).toHaveLength(1)
    expect(course.modules[0].lessons[0].title).toBe('Lección 1')
    expect(courses.list()).toHaveLength(1)
  })

  it('rejects with INVALID_ARGUMENT when no documents are selected', async () => {
    const service = buildService(fakeAIProvider(validStructure))

    await expect(
      service.create({
        objective: 'Aprender algo',
        documentIds: [],
        durationDays: 5,
        dailyMinutes: 10,
        style: 'equilibrado'
      })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' })
  })

  it('rejects with NOT_FOUND when a selected document does not exist', async () => {
    const service = buildService(fakeAIProvider(validStructure))

    await expect(
      service.create({
        objective: 'Aprender algo',
        documentIds: ['missing-doc'],
        durationDays: 5,
        dailyMinutes: 10,
        style: 'equilibrado'
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('re-validates the AI response with Zod and rejects a structurally invalid result, without persisting anything', async () => {
    const malformed = { title: 'Curso', modules: [] } // modules must have at least 1 entry
    const service = buildService(fakeAIProvider(malformed))

    await expect(
      service.create({
        objective: 'Aprender concreto',
        documentIds: [documentId],
        durationDays: 10,
        dailyMinutes: 20,
        style: 'visual'
      })
    ).rejects.toMatchObject({ code: 'AI_INVALID_STRUCTURE' })

    expect(courses.list()).toHaveLength(0)
  })

  it('passes through an AppError raised by the AI provider unchanged', async () => {
    const failingAI: AIProvider = {
      ...fakeAIProvider(validStructure),
      generateStructured: async () => {
        throw new AppError({ code: 'AI_KEY_NOT_CONFIGURED', userMessage: 'Falta la clave.' })
      }
    }
    const service = buildService(failingAI)

    await expect(
      service.create({
        objective: 'Aprender concreto',
        documentIds: [documentId],
        durationDays: 10,
        dailyMinutes: 20,
        style: 'practico'
      })
    ).rejects.toMatchObject({ code: 'AI_KEY_NOT_CONFIGURED' })
  })

  it('links each lesson concept and attaches real citations from retrieval when a matching chunk exists', async () => {
    chunks.replaceChunks(documentId, [
      {
        text: 'Concrete is a composite material.',
        pageStart: 1,
        pageEnd: 1,
        heading: 'Concrete Basics',
        tokenCount: 5,
        embedding: [1, 0]
      }
    ])
    const structureWithConcepts = {
      title: 'Curso generado',
      modules: [
        {
          title: 'Módulo 1',
          lessons: [
            {
              title: 'Lección 1',
              type: 'lesson',
              estimatedMinutes: 15,
              summary: 'Resumen',
              concepts: ['Concrete Basics']
            }
          ]
        }
      ]
    }
    const service = buildService(fakeAIProvider(structureWithConcepts))

    const course = await service.create({
      objective: 'Aprender concreto',
      documentIds: [documentId],
      durationDays: 10,
      dailyMinutes: 20,
      style: 'equilibrado'
    })

    const concepts = new ConceptRepository(db)
    const linked = concepts.listForCourse(course.id)
    expect(linked).toHaveLength(1)
    expect(linked[0].title).toBe('Concrete Basics')
    expect(concepts.getSources(linked[0].id)).toEqual([
      { documentId, documentTitle: 'Michigan Builder Manual', pageStart: 1, pageEnd: 1 }
    ])
  })

  it('creates a course with no concepts linked when the AI response omits them (backward compatible)', async () => {
    const service = buildService(fakeAIProvider(validStructure))

    const course = await service.create({
      objective: 'Aprender concreto',
      documentIds: [documentId],
      durationDays: 10,
      dailyMinutes: 20,
      style: 'equilibrado'
    })

    expect(new ConceptRepository(db).listForCourse(course.id)).toEqual([])
  })
})
