import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { FlashcardRepository } from '../../../src/main/database/repositories/flashcardRepository'

let db: Database.Database
let flashcards: FlashcardRepository
let courseId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  flashcards = new FlashcardRepository(db)
  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const documentId = documents.create({
    title: 'Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
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

describe('FlashcardRepository', () => {
  it('createMany persists a batch and links concepts, returned cards are due by default', () => {
    const created = flashcards.createMany(courseId, [
      { front: 'Q1', back: 'A1', concept: 'Concepto A' },
      { front: 'Q2', back: 'A2', hint: 'pista' }
    ])

    expect(created).toHaveLength(2)
    expect(created[0].front).toBe('Q1')
    expect(created[0].dueToday).toBe(true)
    expect(created[1].hint).toBe('pista')
    expect(created[1].sourceRefs).toEqual([])
  })

  it('createMany appends to an existing deck rather than replacing it', () => {
    flashcards.createMany(courseId, [{ front: 'Q1', back: 'A1' }])
    flashcards.createMany(courseId, [{ front: 'Q2', back: 'A2' }])

    expect(flashcards.listByCourse(courseId)).toHaveLength(2)
  })

  it('create persists a single manual card', () => {
    const card = flashcards.create({ courseId, front: 'Manual Q', back: 'Manual A' })
    expect(card.front).toBe('Manual Q')
    expect(card.hint).toBeNull()
    expect(card.dueToday).toBe(true)
  })

  it('setSourceRefs attaches citations retrievable via getByIds', () => {
    const [card] = flashcards.createMany(courseId, [{ front: 'Q1', back: 'A1' }])
    flashcards.setSourceRefs(card.id, [
      { documentId: 'doc1', documentTitle: 'Manual', pageStart: 3, pageEnd: 3 }
    ])

    const [reloaded] = flashcards.getByIds([card.id])
    expect(reloaded.sourceRefs).toEqual([
      { documentId: 'doc1', documentTitle: 'Manual', pageStart: 3, pageEnd: 3 }
    ])
  })

  it('getByIds preserves the requested id order and skips missing ids', () => {
    const [a, b] = flashcards.createMany(courseId, [
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' }
    ])

    expect(flashcards.getByIds([b.id, 'missing', a.id]).map((c) => c.id)).toEqual([b.id, a.id])
  })

  it('listByCourse orders cards by creation order and scopes per course', () => {
    const documents = new DocumentRepository(db)
    const courses = new CourseRepository(db)
    const otherDocumentId = documents.create({
      title: 'Otro',
      originalFilename: 'otro.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    }).id
    const otherCourseId = courses.create({
      objective: 'Otro',
      documentIds: [otherDocumentId],
      targetDate: null,
      dailyMinutes: 30,
      structure: {
        title: 'Otro curso',
        modules: [
          {
            title: 'M1',
            lessons: [{ title: 'L1', type: 'lesson', estimatedMinutes: 10, summary: 'r' }]
          }
        ]
      }
    }).id

    flashcards.createMany(courseId, [
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' }
    ])
    flashcards.createMany(otherCourseId, [{ front: 'OtherQ', back: 'OtherA' }])

    const list = flashcards.listByCourse(courseId)
    expect(list.map((c) => c.front)).toEqual(['Q1', 'Q2'])
    expect(flashcards.listByCourse(otherCourseId)).toHaveLength(1)
  })

  it('a new card with zero reviews is due by default', () => {
    const [card] = flashcards.createMany(courseId, [{ front: 'Q1', back: 'A1' }])
    expect(flashcards.listDueByCourse(courseId).map((c) => c.id)).toContain(card.id)
  })

  it('a card reviewed with a future next_review_at is not due; a past one is', () => {
    const [card] = flashcards.createMany(courseId, [{ front: 'Q1', back: 'A1' }])
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    flashcards.addReview(card.id, 'good', 10, 2.5, future)

    expect(flashcards.listDueByCourse(courseId)).toEqual([])

    const past = '2000-01-01'
    flashcards.addReview(card.id, 'again', 1, 2.3, past)
    expect(flashcards.listDueByCourse(courseId).map((c) => c.id)).toEqual([card.id])
  })

  it('countsByCourse reports total and due counts', () => {
    const [a, b] = flashcards.createMany(courseId, [
      { front: 'Q1', back: 'A1' },
      { front: 'Q2', back: 'A2' }
    ])
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
    flashcards.addReview(a.id, 'good', 10, 2.5, future)

    expect(flashcards.countsByCourse(courseId)).toEqual({ total: 2, due: 1 })
    expect(b).toBeDefined()
  })

  it('getLatestReview returns null before any review and the most recent one after', () => {
    const [card] = flashcards.createMany(courseId, [{ front: 'Q1', back: 'A1' }])
    expect(flashcards.getLatestReview(card.id)).toBeNull()

    flashcards.addReview(card.id, 'good', 1, 2.5, '2026-01-02')
    flashcards.addReview(card.id, 'easy', 6, 2.65, '2026-01-08')

    expect(flashcards.getLatestReview(card.id)).toEqual({ intervalDays: 6, easeFactor: 2.65 })
  })
})
