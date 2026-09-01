import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { PlanRepository } from '../../../src/main/database/repositories/planRepository'
import { PlanService } from '../../../src/main/plan/planService'

let db: Database.Database
let courses: CourseRepository
let service: PlanService
let courseId: string
let lessonIds: string[]

function setUp(dailyMinutes: number, lessonCount = 3): void {
  db = new Database(':memory:')
  runMigrations(db)
  const documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
  service = new PlanService(courses, new PlanRepository(db))
  const documentId = documents.create({
    title: 'Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
  const lessons = Array.from({ length: lessonCount }, (_, i) => ({
    title: `Lección ${i + 1}`,
    type: 'lesson' as const,
    estimatedMinutes: 20,
    summary: `Resumen ${i + 1}`
  }))
  const course = courses.create({
    objective: 'Aprender',
    documentIds: [documentId],
    targetDate: null,
    dailyMinutes,
    structure: { title: 'Curso', modules: [{ title: 'M1', lessons }] }
  })
  courseId = course.id
  lessonIds = course.modules[0].lessons.map((l) => l.id)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  setUp(20)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PlanService', () => {
  it('throws NOT_FOUND for an unknown course', () => {
    expect(() => service.getPlan('missing')).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })

  it('getPlan builds and persists a v1 plan on first call, distributing lessons by dailyMinutes', () => {
    const plan = service.getPlan(courseId)

    expect(plan.version).toBe(1)
    expect(plan.startDate).toBe('2026-01-01')
    // 20 min/day budget, 20 min/lesson, 3 lessons -> one lesson per day.
    expect(plan.days).toHaveLength(3)
    expect(plan.days.map((d) => d.lessons[0].title)).toEqual([
      'Lección 1',
      'Lección 2',
      'Lección 3'
    ])
  })

  it('getPlan returns the same persisted version on subsequent calls, not a new one', () => {
    const first = service.getPlan(courseId)
    const second = service.getPlan(courseId)

    expect(second.version).toBe(first.version)
    expect(second.id).toBe(first.id)
  })

  it("today's day is marked 'today', later days 'upcoming'", () => {
    const plan = service.getPlan(courseId)

    expect(plan.days[0].status).toBe('today')
    expect(plan.days[1].status).toBe('upcoming')
    expect(plan.days[2].status).toBe('upcoming')
  })

  it("a past day whose lesson isn't completed is marked 'missed'", () => {
    service.getPlan(courseId) // persists the v1 plan starting today (Jan 1)
    vi.setSystemTime(new Date('2026-01-03T12:00:00Z'))

    const plan = service.getPlan(courseId) // same stored plan, re-evaluated against the new "today"

    expect(plan.days[0].status).toBe('missed')
  })

  it('a day whose lesson was completed since the plan was built is marked "completed"', () => {
    service.getPlan(courseId)
    courses.markLessonCompleted(lessonIds[0])

    const plan = service.getPlan(courseId)

    expect(plan.days[0].status).toBe('completed')
    expect(plan.days[0].lessons[0].completed).toBe(true)
  })

  it('recalculate creates a new version and reflects newly-completed lessons', () => {
    const first = service.getPlan(courseId)
    courses.markLessonCompleted(lessonIds[0])

    const recalculated = service.recalculate(courseId, {})

    expect(recalculated.version).toBe(first.version + 1)
    // Lección 1 is done, so only 2 lessons remain to schedule.
    expect(recalculated.days).toHaveLength(2)
  })

  it('recalculate with a new targetDate/dailyMinutes updates the course schedule', () => {
    service.recalculate(courseId, { targetDate: '2026-02-01', dailyMinutes: 60 })

    const course = courses.getById(courseId)
    expect(course?.targetDate).toBe('2026-02-01')
    expect(course?.dailyMinutes).toBe(60)
  })

  it('feasible is true when the pending workload fits before the target date', () => {
    const plan = service.recalculate(courseId, { targetDate: '2026-01-10', dailyMinutes: 20 })
    expect(plan.feasible).toBe(true)
  })

  it('feasible is false when the pending workload cannot fit before the target date', () => {
    // 3 lessons * 20 min = 60 min of work, but only 1 day at 20 min/day available.
    const plan = service.recalculate(courseId, { targetDate: '2026-01-01', dailyMinutes: 20 })
    expect(plan.feasible).toBe(false)
  })

  it('returns an empty plan once every lesson is completed, without throwing', () => {
    for (const lessonId of lessonIds) {
      courses.markLessonCompleted(lessonId)
    }

    const plan = service.getPlan(courseId)

    expect(plan.days).toEqual([])
  })
})
