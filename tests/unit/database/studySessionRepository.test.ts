import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { StudySessionRepository } from '../../../src/main/database/repositories/studySessionRepository'
import type { CourseStructure } from '../../../src/main/courses/courseGenerationSchema'

let db: Database.Database
let courses: CourseRepository
let sessions: StudySessionRepository
let courseId: string
let lessonId: string

const structure: CourseStructure = {
  title: 'Curso',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [{ title: 'Lección 1', type: 'lesson', estimatedMinutes: 15, summary: 'Resumen 1' }]
    }
  ]
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  const documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
  sessions = new StudySessionRepository(db)
  const documentId = documents.create({
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
    structure
  })
  courseId = course.id
  lessonId = course.modules[0].lessons[0].id
})

describe('StudySessionRepository', () => {
  it('creates a session with ordered activities and reconstructs it with lesson details', () => {
    const sessionId = sessions.create(courseId, [{ lessonId }], 15)

    const detail = sessions.getDetail(sessionId)

    expect(detail?.courseId).toBe(courseId)
    expect(detail?.courseTitle).toBe('Curso')
    expect(detail?.status).toBe('in_progress')
    expect(detail?.estimatedMinutes).toBe(15)
    expect(detail?.activities).toHaveLength(1)
    expect(detail?.activities[0]).toMatchObject({
      type: 'lesson',
      lessonId,
      lessonTitle: 'Lección 1',
      lessonSummary: 'Resumen 1',
      completedAt: null
    })
  })

  it('findActiveByCourse finds the in-progress session and ignores completed ones', () => {
    const sessionId = sessions.create(courseId, [{ lessonId }], 15)
    expect(sessions.findActiveByCourse(courseId)).toBe(sessionId)

    sessions.completeSession(sessionId)
    expect(sessions.findActiveByCourse(courseId)).toBeNull()
  })

  it('markActivityCompleted stamps completed_at, and countPendingActivities reflects it', () => {
    const sessionId = sessions.create(courseId, [{ lessonId }], 15)
    const activity = sessions.getDetail(sessionId)!.activities[0]

    expect(sessions.countPendingActivities(sessionId)).toBe(1)
    sessions.markActivityCompleted(activity.id)
    expect(sessions.countPendingActivities(sessionId)).toBe(0)
    expect(sessions.getDetail(sessionId)?.activities[0].completedAt).not.toBeNull()
  })

  it('completeSession sets status, completed_at, and a real elapsed actual_minutes', () => {
    const sessionId = sessions.create(courseId, [{ lessonId }], 15)
    sessions.completeSession(sessionId)

    const detail = sessions.getDetail(sessionId)
    expect(detail?.status).toBe('completed')
    expect(detail?.completedAt).not.toBeNull()
    expect(detail?.actualMinutes).toBeGreaterThanOrEqual(1)
  })

  it('getDetail returns null for an unknown session', () => {
    expect(sessions.getDetail('missing')).toBeNull()
  })

  it('create accepts an activityType override for remediation sessions', () => {
    const sessionId = sessions.create(courseId, [{ lessonId }], 15, 'review')

    expect(sessions.getDetail(sessionId)?.activities[0].type).toBe('review')
  })

  it('getActivity resolves the lesson id embedded in the activity payload', () => {
    const sessionId = sessions.create(courseId, [{ lessonId }], 15)
    const activity = sessions.getDetail(sessionId)!.activities[0]

    expect(sessions.getActivity(activity.id)).toEqual({
      id: activity.id,
      sessionId,
      lessonId,
      courseId
    })
  })
})
