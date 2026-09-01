import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import { upsertConcept } from './conceptRepository'
import type {
  CreateFlashcardInput,
  Flashcard,
  FlashcardSourceRef
} from '../../../shared/types/flashcards'

interface FlashcardRow {
  id: string
  course_id: string
  front: string
  back: string
  hint: string | null
  source_refs_json: string | null
  created_at: string
  latest_next_review_at: string | null
}

export interface GeneratedFlashcardItem {
  front: string
  back: string
  hint?: string
  concept?: string
}

export interface LatestReview {
  intervalDays: number
  easeFactor: number
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function mapFlashcard(row: FlashcardRow, today: string): Flashcard {
  return {
    id: row.id,
    courseId: row.course_id,
    front: row.front,
    back: row.back,
    hint: row.hint,
    sourceRefs: row.source_refs_json
      ? (JSON.parse(row.source_refs_json) as FlashcardSourceRef[])
      : [],
    dueToday: row.latest_next_review_at === null || row.latest_next_review_at <= today,
    createdAt: row.created_at
  }
}

const SELECT_WITH_LATEST_REVIEW = `
  SELECT flashcards.*,
    (SELECT next_review_at FROM flashcard_reviews
     WHERE flashcard_id = flashcards.id
     ORDER BY reviewed_at DESC, id DESC LIMIT 1) as latest_next_review_at
  FROM flashcards
`

export class FlashcardRepository {
  constructor(private readonly db: Database) {}

  /** Persists a freshly generated batch — decks are cumulative, this never replaces existing cards. */
  createMany(courseId: string, items: GeneratedFlashcardItem[]): Flashcard[] {
    const insert = this.db.prepare(
      `INSERT INTO flashcards (id, course_id, concept_id, front, back, hint, source_refs_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    const ids: string[] = []
    const persist = this.db.transaction(() => {
      const now = new Date().toISOString()
      for (const item of items) {
        const id = ulid()
        ids.push(id)
        const conceptId = item.concept ? upsertConcept(this.db, item.concept) : null
        insert.run(id, courseId, conceptId, item.front, item.back, item.hint ?? null, now)
      }
    })
    persist()
    return this.getByIds(ids)
  }

  create(input: CreateFlashcardInput): Flashcard {
    const id = ulid()
    const now = new Date().toISOString()
    this.db
      .prepare(
        `INSERT INTO flashcards (id, course_id, concept_id, front, back, hint, source_refs_json, created_at)
         VALUES (?, ?, NULL, ?, ?, ?, NULL, ?)`
      )
      .run(id, input.courseId, input.front, input.back, input.hint ?? null, now)
    const [created] = this.getByIds([id])
    return created
  }

  setSourceRefs(flashcardId: string, sourceRefs: FlashcardSourceRef[]): void {
    this.db
      .prepare('UPDATE flashcards SET source_refs_json = ? WHERE id = ?')
      .run(JSON.stringify(sourceRefs), flashcardId)
  }

  getByIds(ids: string[]): Flashcard[] {
    if (ids.length === 0) return []
    const today = todayISO()
    const rows = this.db
      .prepare(
        `${SELECT_WITH_LATEST_REVIEW} WHERE flashcards.id IN (${ids.map(() => '?').join(',')})`
      )
      .all(...ids) as FlashcardRow[]
    const byId = new Map(rows.map((row) => [row.id, mapFlashcard(row, today)]))
    return ids.map((id) => byId.get(id)).filter((card): card is Flashcard => card !== undefined)
  }

  listByCourse(courseId: string): Flashcard[] {
    const today = todayISO()
    const rows = this.db
      .prepare(
        `${SELECT_WITH_LATEST_REVIEW} WHERE flashcards.course_id = ? ORDER BY flashcards.created_at ASC, flashcards.id ASC`
      )
      .all(courseId) as FlashcardRow[]
    return rows.map((row) => mapFlashcard(row, today))
  }

  listDueByCourse(courseId: string): Flashcard[] {
    return this.listByCourse(courseId).filter((card) => card.dueToday)
  }

  countsByCourse(courseId: string): { total: number; due: number } {
    const cards = this.listByCourse(courseId)
    return { total: cards.length, due: cards.filter((card) => card.dueToday).length }
  }

  getLatestReview(flashcardId: string): LatestReview | null {
    const row = this.db
      .prepare(
        `SELECT interval_days, ease_factor FROM flashcard_reviews
         WHERE flashcard_id = ? ORDER BY reviewed_at DESC, id DESC LIMIT 1`
      )
      .get(flashcardId) as { interval_days: number; ease_factor: number } | undefined
    return row ? { intervalDays: row.interval_days, easeFactor: row.ease_factor } : null
  }

  addReview(
    flashcardId: string,
    rating: string,
    intervalDays: number,
    easeFactor: number,
    nextReviewAt: string
  ): void {
    this.db
      .prepare(
        `INSERT INTO flashcard_reviews (id, flashcard_id, reviewed_at, rating, interval_days, ease_factor, next_review_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ulid(),
        flashcardId,
        new Date().toISOString(),
        rating,
        intervalDays,
        easeFactor,
        nextReviewAt
      )
  }

  /** Global review accuracy for Fase 11's Progreso dashboard — "positive" means a rating of 'good' or 'easy'. */
  getReviewStats(): { total: number; positive: number } {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as total,
           COALESCE(SUM(CASE WHEN rating IN ('good', 'easy') THEN 1 ELSE 0 END), 0) as positive
         FROM flashcard_reviews`
      )
      .get() as { total: number; positive: number }
    return row
  }
}
