import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type { ConceptSource } from '../../../shared/types/mastery'

export type ConceptImportance = 'primary' | 'secondary'

export function canonicalKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Finds or creates a concept by its canonical key. `concepts` is global
 * (not scoped to a course) so the same concept mentioned by lessons or
 * questions in different courses collapses to one row — a prerequisite for
 * `mastery_scores` to mean anything per (concept, course) pair. Plain
 * prepared-statement calls, no transaction of its own, so it's safe to
 * call from inside an existing `db.transaction()` closure.
 */
export function upsertConcept(db: Database, title: string): string {
  const key = canonicalKey(title)
  const existing = db.prepare('SELECT id FROM concepts WHERE canonical_key = ?').get(key) as
    { id: string } | undefined
  if (existing) return existing.id

  const id = ulid()
  db.prepare(
    'INSERT INTO concepts (id, title, description, canonical_key, created_at) VALUES (?, ?, NULL, ?, ?)'
  ).run(id, title, key, new Date().toISOString())
  return id
}

export interface ConceptRow {
  id: string
  title: string
}

export class ConceptRepository {
  constructor(private readonly db: Database) {}

  /** Every concept linked to any lesson in this course, deduplicated. */
  listForCourse(courseId: string): ConceptRow[] {
    return this.db
      .prepare(
        `SELECT DISTINCT concepts.id, concepts.title
         FROM concepts
         JOIN lesson_concepts ON lesson_concepts.concept_id = concepts.id
         JOIN lessons ON lessons.id = lesson_concepts.lesson_id
         JOIN modules ON modules.id = lessons.module_id
         WHERE modules.course_id = ?`
      )
      .all(courseId) as ConceptRow[]
  }

  listConceptIdsForLesson(lessonId: string): string[] {
    const rows = this.db
      .prepare('SELECT concept_id FROM lesson_concepts WHERE lesson_id = ?')
      .all(lessonId) as { concept_id: string }[]
    return rows.map((row) => row.concept_id)
  }

  /** Every lesson in this course that covers the given concept — feeds remediation session batching. */
  getLessonIdsForConcept(courseId: string, conceptId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT lessons.id
         FROM lessons
         JOIN lesson_concepts ON lesson_concepts.lesson_id = lessons.id
         JOIN modules ON modules.id = lessons.module_id
         WHERE modules.course_id = ? AND lesson_concepts.concept_id = ?`
      )
      .all(courseId, conceptId) as { id: string }[]
    return rows.map((row) => row.id)
  }

  linkLessonConcept(lessonId: string, conceptId: string, importance: ConceptImportance): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO lesson_concepts (lesson_id, concept_id, importance) VALUES (?, ?, ?)'
      )
      .run(lessonId, conceptId, importance)
  }

  addSource(conceptId: string, documentChunkId: string, relevance: number): void {
    this.db
      .prepare(
        'INSERT OR IGNORE INTO concept_sources (concept_id, document_chunk_id, relevance) VALUES (?, ?, ?)'
      )
      .run(conceptId, documentChunkId, relevance)
  }

  getSources(conceptId: string): ConceptSource[] {
    const rows = this.db
      .prepare(
        `SELECT documents.id as document_id, documents.title as document_title,
                document_chunks.page_start, document_chunks.page_end
         FROM concept_sources
         JOIN document_chunks ON document_chunks.id = concept_sources.document_chunk_id
         JOIN documents ON documents.id = document_chunks.document_id
         WHERE concept_sources.concept_id = ?
         ORDER BY concept_sources.relevance DESC`
      )
      .all(conceptId) as {
      document_id: string
      document_title: string
      page_start: number
      page_end: number
    }[]

    return rows.map((row) => ({
      documentId: row.document_id,
      documentTitle: row.document_title,
      pageStart: row.page_start,
      pageEnd: row.page_end
    }))
  }
}
