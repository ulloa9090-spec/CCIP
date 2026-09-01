import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'

export interface PlanDayEntry {
  date: string
  lessonIds: string[]
  estimatedMinutes: number
}

export interface StoredPlan {
  id: string
  courseId: string
  version: number
  startDate: string
  targetDate: string
  dailyMinutes: number
  days: PlanDayEntry[]
}

interface PlanRow {
  id: string
  course_id: string
  version: number
  start_date: string
  target_date: string
  daily_minutes: number
  plan_json: string
}

function mapPlan(row: PlanRow): StoredPlan {
  return {
    id: row.id,
    courseId: row.course_id,
    version: row.version,
    startDate: row.start_date,
    targetDate: row.target_date,
    dailyMinutes: row.daily_minutes,
    days: JSON.parse(row.plan_json) as PlanDayEntry[]
  }
}

export class PlanRepository {
  constructor(private readonly db: Database) {}

  getLatest(courseId: string): StoredPlan | null {
    const row = this.db
      .prepare('SELECT * FROM study_plans WHERE course_id = ? ORDER BY version DESC LIMIT 1')
      .get(courseId) as PlanRow | undefined
    return row ? mapPlan(row) : null
  }

  /** Always inserts a new version — a plan is a point-in-time projection, never overwritten in place. */
  create(
    courseId: string,
    startDate: string,
    targetDate: string,
    dailyMinutes: number,
    days: PlanDayEntry[]
  ): StoredPlan {
    const previous = this.getLatest(courseId)
    const version = (previous?.version ?? 0) + 1
    const id = ulid()
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO study_plans (id, course_id, version, start_date, target_date, daily_minutes, plan_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, courseId, version, startDate, targetDate, dailyMinutes, JSON.stringify(days), now)

    return { id, courseId, version, startDate, targetDate, dailyMinutes, days }
  }
}
