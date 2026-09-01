import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import {
  ConceptRepository,
  canonicalKey,
  upsertConcept
} from '../../../src/main/database/repositories/conceptRepository'

let db: Database.Database
let concepts: ConceptRepository
let courseId: string
let lessonId: string
let documentId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  concepts = new ConceptRepository(db)
  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  documentId = documents.create({
    title: 'Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
  const course = courses.create({
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
  })
  courseId = course.id
  lessonId = course.modules[0].lessons[0].id
})

describe('canonicalKey', () => {
  it('lowercases, strips accents, and hyphenates', () => {
    expect(canonicalKey('Órdenes de Cambio')).toBe('ordenes-de-cambio')
  })

  it('trims stray punctuation and collapses separators', () => {
    expect(canonicalKey('  Change Orders!! ')).toBe('change-orders')
  })
})

describe('upsertConcept', () => {
  it('creates a new concept for a title never seen before', () => {
    const id = upsertConcept(db, 'Change Orders')
    const row = db.prepare('SELECT title, canonical_key FROM concepts WHERE id = ?').get(id) as {
      title: string
      canonical_key: string
    }
    expect(row).toEqual({ title: 'Change Orders', canonical_key: 'change-orders' })
  })

  it('deduplicates by canonical key, ignoring case/accents/whitespace differences', () => {
    const first = upsertConcept(db, 'Change Orders')
    const second = upsertConcept(db, '  change orders  ')

    expect(second).toBe(first)
    expect(db.prepare('SELECT COUNT(*) as count FROM concepts').get()).toEqual({ count: 1 })
  })
})

describe('ConceptRepository', () => {
  it('linkLessonConcept + listForCourse surfaces concepts linked via that course’s lessons', () => {
    const conceptId = upsertConcept(db, 'Change Orders')
    concepts.linkLessonConcept(lessonId, conceptId, 'primary')

    const linked = concepts.listForCourse(courseId)
    expect(linked).toEqual([{ id: conceptId, title: 'Change Orders' }])
  })

  it('listConceptIdsForLesson returns every concept linked to a lesson', () => {
    const a = upsertConcept(db, 'Concept A')
    const b = upsertConcept(db, 'Concept B')
    concepts.linkLessonConcept(lessonId, a, 'primary')
    concepts.linkLessonConcept(lessonId, b, 'secondary')

    expect(concepts.listConceptIdsForLesson(lessonId).sort()).toEqual([a, b].sort())
  })

  it('getLessonIdsForConcept scopes to the given course', () => {
    const conceptId = upsertConcept(db, 'Change Orders')
    concepts.linkLessonConcept(lessonId, conceptId, 'primary')

    expect(concepts.getLessonIdsForConcept(courseId, conceptId)).toEqual([lessonId])
    expect(concepts.getLessonIdsForConcept('other-course', conceptId)).toEqual([])
  })

  it('addSource + getSources returns real chunk citations ordered by relevance', () => {
    const chunkRepo = new DocumentChunkRepository(db)
    chunkRepo.replaceChunks(documentId, [
      { text: 'a', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] },
      { text: 'b', pageStart: 5, pageEnd: 5, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])
    const chunks = chunkRepo.getEmbeddedChunks([documentId])
    const conceptId = upsertConcept(db, 'Change Orders')

    concepts.addSource(conceptId, chunks[0].chunkId, 0.5)
    concepts.addSource(conceptId, chunks[1].chunkId, 0.9)

    const sources = concepts.getSources(conceptId)
    expect(sources).toEqual([
      { documentId, documentTitle: 'Manual', pageStart: 5, pageEnd: 5 },
      { documentId, documentTitle: 'Manual', pageStart: 1, pageEnd: 1 }
    ])
  })

  it('getSources returns an empty array for a concept with no citations', () => {
    const conceptId = upsertConcept(db, 'Lonely concept')
    expect(concepts.getSources(conceptId)).toEqual([])
  })
})
