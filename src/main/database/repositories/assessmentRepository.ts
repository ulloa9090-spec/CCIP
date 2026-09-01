import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type { AssessmentHistoryEntry } from '../../../shared/types/assessment'

interface AttemptRow {
  id: string
  assessment_type: string
  course_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  total_questions: number
  correct_count: number | null
  duration_seconds: number | null
}

export interface AttemptMeta {
  id: string
  courseId: string
  courseTitle: string
  completedAt: string | null
  score: number | null
  correctCount: number | null
  totalQuestions: number
  durationSeconds: number | null
}

export interface AnswerState {
  choiceIndex: number
  isCorrect: boolean
}

export class AssessmentRepository {
  constructor(private readonly db: Database) {}

  /**
   * Creates the attempt and one unanswered slot per question, in order —
   * see migration 0007's note on why `assessment_answers` doubles as the
   * attempt's question manifest.
   */
  createAttempt(courseId: string, assessmentType: string, questionIds: string[]): string {
    const now = new Date().toISOString()
    const attemptId = ulid()

    const persist = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO assessment_attempts
             (id, assessment_type, course_id, started_at, completed_at, score, total_questions, correct_count, duration_seconds)
           VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, NULL)`
        )
        .run(attemptId, assessmentType, courseId, now, questionIds.length)

      const insertSlot = this.db.prepare(
        `INSERT INTO assessment_answers
           (id, attempt_id, question_id, answer_json, is_correct, response_time_ms, confidence_optional)
         VALUES (?, ?, ?, NULL, NULL, NULL, NULL)`
      )
      for (const questionId of questionIds) {
        insertSlot.run(ulid(), attemptId, questionId)
      }
    })
    persist()

    return attemptId
  }

  getAttemptMeta(attemptId: string): AttemptMeta | null {
    const row = this.db
      .prepare(
        `SELECT assessment_attempts.*, courses.title as course_title
         FROM assessment_attempts
         JOIN courses ON courses.id = assessment_attempts.course_id
         WHERE assessment_attempts.id = ?`
      )
      .get(attemptId) as (AttemptRow & { course_title: string }) | undefined
    if (!row) return null
    return {
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      completedAt: row.completed_at,
      score: row.score,
      correctCount: row.correct_count,
      totalQuestions: row.total_questions,
      durationSeconds: row.duration_seconds
    }
  }

  /** Rows were inserted in question order, and ids come from the monotonic ulid factory. */
  getQuestionIdsInOrder(attemptId: string): string[] {
    const rows = this.db
      .prepare('SELECT question_id FROM assessment_answers WHERE attempt_id = ? ORDER BY id ASC')
      .all(attemptId) as { question_id: string }[]
    return rows.map((row) => row.question_id)
  }

  getAnswers(attemptId: string): Map<string, AnswerState> {
    const rows = this.db
      .prepare(
        'SELECT question_id, answer_json, is_correct FROM assessment_answers WHERE attempt_id = ? AND answer_json IS NOT NULL'
      )
      .all(attemptId) as { question_id: string; answer_json: string; is_correct: number }[]
    return new Map(
      rows.map((row) => [
        row.question_id,
        {
          choiceIndex: (JSON.parse(row.answer_json) as { choiceIndex: number }).choiceIndex,
          isCorrect: row.is_correct === 1
        }
      ])
    )
  }

  submitAnswer(
    attemptId: string,
    questionId: string,
    choiceIndex: number,
    isCorrect: boolean
  ): void {
    this.db
      .prepare(
        'UPDATE assessment_answers SET answer_json = ?, is_correct = ? WHERE attempt_id = ? AND question_id = ?'
      )
      .run(JSON.stringify({ choiceIndex }), isCorrect ? 1 : 0, attemptId, questionId)
  }

  finishAttempt(attemptId: string): void {
    const now = new Date().toISOString()
    const answers = this.db
      .prepare('SELECT is_correct FROM assessment_answers WHERE attempt_id = ?')
      .all(attemptId) as { is_correct: number | null }[]
    const total = answers.length
    const correct = answers.filter((answer) => answer.is_correct === 1).length
    const score = total > 0 ? Math.round((correct / total) * 100) : 0

    const attempt = this.db
      .prepare('SELECT started_at FROM assessment_attempts WHERE id = ?')
      .get(attemptId) as { started_at: string }
    const durationSeconds = Math.max(
      1,
      Math.round((Date.parse(now) - Date.parse(attempt.started_at)) / 1000)
    )

    this.db
      .prepare(
        'UPDATE assessment_attempts SET completed_at = ?, score = ?, correct_count = ?, duration_seconds = ? WHERE id = ?'
      )
      .run(now, score, correct, durationSeconds, attemptId)
  }

  /** Average score of this course's other completed attempts, for the results screen's "vs. last time." */
  getPreviousAverageScore(courseId: string, excludeAttemptId: string): number | null {
    const rows = this.db
      .prepare(
        'SELECT score FROM assessment_attempts WHERE course_id = ? AND id != ? AND completed_at IS NOT NULL'
      )
      .all(courseId, excludeAttemptId) as { score: number }[]
    if (rows.length === 0) return null
    return Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
  }

  listHistory(): AssessmentHistoryEntry[] {
    const rows = this.db
      .prepare(
        `SELECT assessment_attempts.id, assessment_attempts.course_id, courses.title as course_title,
                assessment_attempts.score, assessment_attempts.total_questions, assessment_attempts.completed_at
         FROM assessment_attempts
         JOIN courses ON courses.id = assessment_attempts.course_id
         WHERE assessment_attempts.completed_at IS NOT NULL
         ORDER BY assessment_attempts.completed_at DESC, assessment_attempts.id DESC`
      )
      .all() as {
      id: string
      course_id: string
      course_title: string
      score: number
      total_questions: number
      completed_at: string
    }[]

    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      score: row.score,
      totalQuestions: row.total_questions,
      completedAt: row.completed_at
    }))
  }
}
