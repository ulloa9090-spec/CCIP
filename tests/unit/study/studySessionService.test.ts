import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { StudySessionRepository } from '../../../src/main/database/repositories/studySessionRepository'
import { StudySessionService } from '../../../src/main/study/studySessionService'
import type { CourseStructure } from '../../../src/main/courses/courseGenerationSchema'

let db: Database.Database
let courses: CourseRepository
let service: StudySessionService
let courseId: string

const structure: CourseStructure = {
  title: 'Curso',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [
        { title: 'Lección 1', type: 'lesson', estimatedMinutes: 15, summary: 'Resumen 1' },
        { title: 'Lección 2', type: 'lesson', estimatedMinutes: 15, summary: 'Resumen 2' },
        { title: 'Lección 3', type: 'lesson', estimatedMinutes: 15, summary: 'Resumen 3' }
      ]
    }
  ]
}

function setUp(dailyMinutes: number): void {
  db = new Database(':memory:')
  runMigrations(db)
  const documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
  service = new StudySessionService(courses, new StudySessionRepository(db))
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
    dailyMinutes,
    structure
  }).id
}

describe('StudySessionService', () => {
  beforeEach(() => setUp(30))

  it('throws NOT_FOUND for an unknown course', () => {
    expect(() => service.startOrResume('missing')).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })

  it('batches pending lessons up to the course daily-minutes budget', () => {
    const detail = service.startOrResume(courseId)

    // 30 min budget, 15 min/lesson → exactly 2 of the 3 lessons.
    expect(detail.activities).toHaveLength(2)
    expect(detail.activities.map((a) => a.lessonTitle)).toEqual(['Lección 1', 'Lección 2'])
    expect(detail.estimatedMinutes).toBe(30)
    expect(detail.status).toBe('in_progress')
  })

  it('always includes at least one lesson even if it alone exceeds the daily budget', () => {
    setUp(5) // smaller than any single lesson's 15 minutes
    const detail = service.startOrResume(courseId)

    expect(detail.activities).toHaveLength(1)
  })

  it('resumes the same in-progress session on a second call instead of creating a new one', () => {
    const first = service.startOrResume(courseId)
    const second = service.startOrResume(courseId)

    expect(second.id).toBe(first.id)
  })

  it('completeActivity(understood=true) marks the lesson completed and advances pending count', () => {
    const session = service.startOrResume(courseId)
    const [firstActivity] = session.activities

    const updated = service.completeActivity(firstActivity.id, true)

    expect(updated.activities[0].completedAt).not.toBeNull()
    expect(courses.getById(courseId)?.modules[0].lessons[0].status).toBe('completed')
  })

  it('completeActivity(understood=false) leaves the activity pending but marks the lesson in_progress', () => {
    const session = service.startOrResume(courseId)
    const [firstActivity] = session.activities

    const updated = service.completeActivity(firstActivity.id, false)

    expect(updated.activities[0].completedAt).toBeNull()
    expect(courses.getById(courseId)?.modules[0].lessons[0].status).toBe('in_progress')
  })

  it('completing every activity in the session marks the session itself completed', () => {
    const session = service.startOrResume(courseId)

    let updated = service.completeActivity(session.activities[0].id, true)
    expect(updated.status).toBe('in_progress')
    updated = service.completeActivity(session.activities[1].id, true)

    expect(updated.status).toBe('completed')
    expect(updated.completedAt).not.toBeNull()
  })

  it('starting a new session after completing the previous one continues with the remaining lesson', () => {
    const first = service.startOrResume(courseId)
    service.completeActivity(first.activities[0].id, true)
    service.completeActivity(first.activities[1].id, true)

    const second = service.startOrResume(courseId)

    expect(second.id).not.toBe(first.id)
    expect(second.activities.map((a) => a.lessonTitle)).toEqual(['Lección 3'])
  })

  it('throws COURSE_COMPLETE once every lesson is completed', () => {
    const first = service.startOrResume(courseId)
    service.completeActivity(first.activities[0].id, true)
    service.completeActivity(first.activities[1].id, true)
    const second = service.startOrResume(courseId)
    service.completeActivity(second.activities[0].id, true)

    expect(() => service.startOrResume(courseId)).toThrowError(
      expect.objectContaining({ code: 'COURSE_COMPLETE' })
    )
  })

  it('completeActivity throws NOT_FOUND for an unknown activity id', () => {
    expect(() => service.completeActivity('missing', true)).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })
})
