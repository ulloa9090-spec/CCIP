import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type { MasteryState } from '../../../shared/types/mastery'

interface MasteryRow {
  concept_id: string
  score: number
  state: MasteryState
  evidence_count: number
}

export interface MasteryScore {
  conceptId: string
  score: number
  state: MasteryState
  evidenceCount: number
}

/** `new` only applies when there's no evidence at all — everything else is a score threshold. */
function deriveState(score: number, evidenceCount: number): MasteryState {
  if (evidenceCount === 0) return 'new'
  if (score >= 90) return 'mastered'
  if (score >= 75) return 'competent'
  if (score >= 50) return 'familiar'
  return 'learning'
}

export class MasteryRepository {
  constructor(private readonly db: Database) {}

  get(conceptId: string, courseId: string): MasteryScore | null {
    const row = this.db
      .prepare('SELECT * FROM mastery_scores WHERE concept_id = ? AND course_id = ?')
      .get(conceptId, courseId) as MasteryRow | undefined
    if (!row) return null
    return {
      conceptId: row.concept_id,
      score: row.score,
      state: row.state,
      evidenceCount: row.evidence_count
    }
  }

  /**
   * Records one piece of evidence (0-100) for a concept in a course and
   * recomputes its running average — a simple cumulative mean, deliberately
   * not a decay-weighted formula: fewer moving parts, fully deterministic,
   * and there's no real signal yet for why recent evidence should count
   * more than older evidence. See docs/DECISIONS.md (Fase 8 ADR).
   */
  recordEvidence(conceptId: string, courseId: string, evidenceValue: number): MasteryScore {
    const now = new Date().toISOString()
    const existing = this.get(conceptId, courseId)
    const evidenceCount = (existing?.evidenceCount ?? 0) + 1
    const score = existing
      ? Math.round((existing.score * existing.evidenceCount + evidenceValue) / evidenceCount)
      : evidenceValue
    const state = deriveState(score, evidenceCount)

    if (existing) {
      this.db
        .prepare(
          'UPDATE mastery_scores SET score = ?, state = ?, evidence_count = ?, last_updated = ? WHERE concept_id = ? AND course_id = ?'
        )
        .run(score, state, evidenceCount, now, conceptId, courseId)
    } else {
      this.db
        .prepare(
          `INSERT INTO mastery_scores (id, concept_id, course_id, score, state, evidence_count, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(ulid(), conceptId, courseId, score, state, evidenceCount, now)
    }

    return { conceptId, score, state, evidenceCount }
  }

  listForCourse(courseId: string): MasteryScore[] {
    const rows = this.db
      .prepare('SELECT * FROM mastery_scores WHERE course_id = ?')
      .all(courseId) as MasteryRow[]
    return rows.map((row) => ({
      conceptId: row.concept_id,
      score: row.score,
      state: row.state,
      evidenceCount: row.evidence_count
    }))
  }
}
