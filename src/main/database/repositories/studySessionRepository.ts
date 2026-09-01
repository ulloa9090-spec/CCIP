import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type {
  ActivityType,
  SessionActivity,
  SessionStatus,
  StudySessionDetail
} from '../../../shared/types/study'

interface SessionRow {
  id: string
  course_id: string
  planned_date: string | null
  started_at: string | null
  completed_at: string | null
  estimated_minutes: number
  actual_minutes: number | null
  status: SessionStatus
}

interface ActivityRow {
  id: string
  study_session_id: string
  activity_type: ActivityType
  payload_json: string
  position: number
  completed_at: string | null
}

interface LessonRow {
  id: string
  title: string
  summary: string | null
  estimated_minutes: number
}

function parseLessonId(payloadJson: string): string {
  return (JSON.parse(payloadJson) as { lessonId: string }).lessonId
}

export interface CreateSessionActivityInput {
  lessonId: string
}

export class StudySessionRepository {
  constructor(private readonly db: Database) {}

  create(
    courseId: string,
    activities: CreateSessionActivityInput[],
    estimatedMinutes: number,
    activityType: ActivityType = 'lesson'
  ): string {
    const now = new Date().toISOString()
    const sessionId = ulid()

    const persist = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO study_sessions
             (id, course_id, planned_date, started_at, completed_at, estimated_minutes, actual_minutes, status)
           VALUES (?, ?, ?, ?, NULL, ?, NULL, 'in_progress')`
        )
        .run(sessionId, courseId, now.slice(0, 10), now, estimatedMinutes)

      const insertActivity = this.db.prepare(
        `INSERT INTO session_activities (id, study_session_id, activity_type, payload_json, position, completed_at)
         VALUES (?, ?, ?, ?, ?, NULL)`
      )
      activities.forEach((activity, index) => {
        insertActivity.run(
          ulid(),
          sessionId,
          activityType,
          JSON.stringify({ lessonId: activity.lessonId }),
          index
        )
      })
    })
    persist()

    return sessionId
  }

  findActiveByCourse(courseId: string): string | null {
    const row = this.db
      .prepare(
        `SELECT id FROM study_sessions WHERE course_id = ? AND status = 'in_progress'
         ORDER BY started_at DESC LIMIT 1`
      )
      .get(courseId) as { id: string } | undefined
    return row?.id ?? null
  }

  getDetail(sessionId: string): StudySessionDetail | null {
    const sessionRow = this.db
      .prepare('SELECT * FROM study_sessions WHERE id = ?')
      .get(sessionId) as SessionRow | undefined
    if (!sessionRow) return null

    const course = this.db
      .prepare('SELECT title FROM courses WHERE id = ?')
      .get(sessionRow.course_id) as { title: string } | undefined

    const activityRows = this.db
      .prepare('SELECT * FROM session_activities WHERE study_session_id = ? ORDER BY position ASC')
      .all(sessionId) as ActivityRow[]

    const lessonIds = activityRows.map((row) => parseLessonId(row.payload_json))
    const lessons =
      lessonIds.length > 0
        ? (this.db
            .prepare(
              `SELECT id, title, summary, estimated_minutes FROM lessons WHERE id IN (${lessonIds
                .map(() => '?')
                .join(',')})`
            )
            .all(...lessonIds) as LessonRow[])
        : []
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

    const activities: SessionActivity[] = activityRows.map((row) => {
      const lessonId = parseLessonId(row.payload_json)
      const lesson = lessonById.get(lessonId)
      return {
        id: row.id,
        type: row.activity_type,
        position: row.position,
        completedAt: row.completed_at,
        lessonId,
        lessonTitle: lesson?.title ?? '',
        lessonSummary: lesson?.summary ?? null,
        estimatedMinutes: lesson?.estimated_minutes ?? 0
      }
    })

    return {
      id: sessionRow.id,
      courseId: sessionRow.course_id,
      courseTitle: course?.title ?? '',
      status: sessionRow.status,
      plannedDate: sessionRow.planned_date,
      startedAt: sessionRow.started_at,
      completedAt: sessionRow.completed_at,
      estimatedMinutes: sessionRow.estimated_minutes,
      actualMinutes: sessionRow.actual_minutes,
      activities
    }
  }

  getActivity(
    activityId: string
  ): { id: string; sessionId: string; lessonId: string; courseId: string } | null {
    const row = this.db
      .prepare(
        `SELECT session_activities.*, study_sessions.course_id as course_id
         FROM session_activities
         JOIN study_sessions ON study_sessions.id = session_activities.study_session_id
         WHERE session_activities.id = ?`
      )
      .get(activityId) as (ActivityRow & { course_id: string }) | undefined
    if (!row) return null
    return {
      id: row.id,
      sessionId: row.study_session_id,
      lessonId: parseLessonId(row.payload_json),
      courseId: row.course_id
    }
  }

  markActivityCompleted(activityId: string): void {
    this.db
      .prepare('UPDATE session_activities SET completed_at = ? WHERE id = ?')
      .run(new Date().toISOString(), activityId)
  }

  countPendingActivities(sessionId: string): number {
    const row = this.db
      .prepare(
        'SELECT COUNT(*) as count FROM session_activities WHERE study_session_id = ? AND completed_at IS NULL'
      )
      .get(sessionId) as { count: number }
    return row.count
  }

  completeSession(sessionId: string): void {
    const now = new Date().toISOString()
    const session = this.db
      .prepare('SELECT started_at FROM study_sessions WHERE id = ?')
      .get(sessionId) as { started_at: string | null }
    const actualMinutes = session.started_at
      ? Math.max(1, Math.round((Date.parse(now) - Date.parse(session.started_at)) / 60_000))
      : 0
    this.db
      .prepare(
        "UPDATE study_sessions SET status = 'completed', completed_at = ?, actual_minutes = ? WHERE id = ?"
      )
      .run(now, actualMinutes, sessionId)
  }

  /** Sum of real elapsed time across every completed session, for Fase 11's Progreso dashboard. */
  getTotalActualMinutes(): number {
    const row = this.db
      .prepare('SELECT COALESCE(SUM(actual_minutes), 0) as total FROM study_sessions')
      .get() as { total: number }
    return row.total
  }

  /** `sinceDateISO` is a plain YYYY-MM-DD; string comparison against the full ISO timestamp works because it's a valid prefix. */
  getActualMinutesSince(sinceDateISO: string): number {
    const row = this.db
      .prepare(
        'SELECT COALESCE(SUM(actual_minutes), 0) as total FROM study_sessions WHERE completed_at >= ?'
      )
      .get(sinceDateISO) as { total: number }
    return row.total
  }

  /** Distinct calendar dates (YYYY-MM-DD) with at least one completed session — the raw material for a study streak. */
  getCompletedDates(): string[] {
    const rows = this.db
      .prepare(
        'SELECT DISTINCT substr(completed_at, 1, 10) as d FROM study_sessions WHERE completed_at IS NOT NULL'
      )
      .all() as { d: string }[]
    return rows.map((row) => row.d)
  }
}
