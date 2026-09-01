import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { QuestionRepository } from '../../../src/main/database/repositories/questionRepository'
import { AssessmentRepository } from '../../../src/main/database/repositories/assessmentRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { RetrievalService } from '../../../src/main/retrieval/retrievalService'
import { QuizService } from '../../../src/main/assessment/quizService'
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

const validQuiz = {
  questions: [
    {
      prompt: 'Q1',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 0,
      explanation: 'e1',
      difficulty: 'easy'
    },
    {
      prompt: 'Q2',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 1,
      explanation: 'e2',
      difficulty: 'medium'
    },
    {
      prompt: 'Q3',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 2,
      explanation: 'e3',
      difficulty: 'hard'
    },
    {
      prompt: 'Q4',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 3,
      explanation: 'e4',
      difficulty: 'easy'
    },
    {
      prompt: 'Q5',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 0,
      explanation: 'e5',
      difficulty: 'medium'
    }
  ]
}

let db: Database.Database
let documents: DocumentRepository
let courses: CourseRepository
let chunks: DocumentChunkRepository
let courseId: string
let documentId: string

function buildService(ai: AIProvider): QuizService {
  return new QuizService(
    courses,
    documents,
    new QuestionRepository(db),
    new AssessmentRepository(db),
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
    objective: 'Aprobar el examen',
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

describe('QuizService', () => {
  it('generates a quiz, persists its questions, and creates an attempt covering all of them', async () => {
    const service = buildService(fakeAIProvider(validQuiz))

    const { attemptId } = await service.generate(courseId)
    const detail = service.getAttemptDetail(attemptId)

    expect(detail.courseId).toBe(courseId)
    expect(detail.completedAt).toBeNull()
    expect(detail.questions).toHaveLength(5)
    expect(detail.questions[0].prompt).toBe('Q1')
    expect(detail.questions[0].selectedIndex).toBeNull()
    // Correct answers must never leak into the in-progress player payload.
    expect(detail.questions[0]).not.toHaveProperty('correctIndex')
  })

  it('rejects with NOT_FOUND for an unknown course', async () => {
    const service = buildService(fakeAIProvider(validQuiz))
    await expect(service.generate('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('re-validates the AI response with Zod and rejects a malformed quiz without persisting anything', async () => {
    const malformed = { questions: [] } // needs at least 5
    const service = buildService(fakeAIProvider(malformed))

    await expect(service.generate(courseId)).rejects.toMatchObject({ code: 'AI_INVALID_STRUCTURE' })
    expect(service.listHistory()).toEqual([])
  })

  it('passes through an AppError raised by the AI provider unchanged', async () => {
    const failingAI: AIProvider = {
      ...fakeAIProvider(validQuiz),
      generateStructured: async () => {
        throw new AppError({ code: 'AI_KEY_NOT_CONFIGURED', userMessage: 'Falta la clave.' })
      }
    }
    const service = buildService(failingAI)

    await expect(service.generate(courseId)).rejects.toMatchObject({
      code: 'AI_KEY_NOT_CONFIGURED'
    })
  })

  it('submitAnswer scores against the real correct index and finish computes the final result', async () => {
    const service = buildService(fakeAIProvider(validQuiz))
    const { attemptId } = await service.generate(courseId)
    const detail = service.getAttemptDetail(attemptId)

    service.submitAnswer(attemptId, detail.questions[0].id, 0) // correct
    service.submitAnswer(attemptId, detail.questions[1].id, 3) // incorrect (correct is 1)

    const result = service.finish(attemptId)

    expect(result.totalQuestions).toBe(5)
    expect(result.correctCount).toBe(1)
    expect(result.score).toBe(20)
    const [q1, q2] = result.questions
    expect(q1.isCorrect).toBe(true)
    expect(q1.correctIndex).toBe(0)
    expect(q2.isCorrect).toBe(false)
    expect(q2.selectedIndex).toBe(3)
  })

  it('attaches a real citation from retrieval when a matching chunk exists, and skips it otherwise', async () => {
    chunks.replaceChunks(documentId, [
      {
        text: 'Q1',
        pageStart: 3,
        pageEnd: 3,
        heading: null,
        tokenCount: 1,
        embedding: [1, 0]
      }
    ])
    const service = buildService(fakeAIProvider(validQuiz))

    const { attemptId } = await service.generate(courseId)
    service.finish(attemptId)
    const result = service.getResult(attemptId)

    expect(result.questions[0].sourceRefs).toEqual([
      { documentId, documentTitle: 'Manual', pageStart: 3, pageEnd: 3 }
    ])
  })

  it('computes previousAverageScore across completed attempts for the same course', async () => {
    const service = buildService(fakeAIProvider(validQuiz))

    const first = await service.generate(courseId)
    const firstDetail = service.getAttemptDetail(first.attemptId)
    firstDetail.questions.forEach((q, i) =>
      service.submitAnswer(first.attemptId, q.id, validQuiz.questions[i].correctIndex)
    )
    service.finish(first.attemptId) // 100%

    const second = await service.generate(courseId)
    const result = service.getResult(second.attemptId)

    expect(result.previousAverageScore).toBe(100)
  })

  it('listHistory reflects only finished attempts', async () => {
    const service = buildService(fakeAIProvider(validQuiz))
    const { attemptId } = await service.generate(courseId)
    expect(service.listHistory()).toEqual([])

    service.finish(attemptId)
    expect(service.listHistory()).toHaveLength(1)
  })
})
