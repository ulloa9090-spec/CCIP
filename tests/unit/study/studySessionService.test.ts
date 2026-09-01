import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { StudySessionRepository } from '../../../src/main/database/repositories/studySessionRepository'
import {
  ConceptRepository,
  upsertConcept
} from '../../../src/main/database/repositories/conceptRepository'
import { MasteryRepository } from '../../../src/main/database/repositories/masteryRepository'
import { StudySessionService } from '../../../src/main/study/studySessionService'
import { MasteryService } from '../../../src/main/mastery/masteryService'
import type { CourseStructure } from '../../../src/main/courses/courseGenerationSchema'

let db: Database.Database
let courses: CourseRepository
let concepts: ConceptRepository
let mastery: MasteryRepository
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
  concepts = new ConceptRepository(db)
  mastery = new MasteryRepository(db)
  service = new StudySessionService(
    courses,
    new StudySessionRepository(db),
    concepts,
    new MasteryService(concepts, mastery)
  )
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

  it('completeActivity records mastery evidence for every concept linked to the lesson', () => {
    const session = service.startOrResume(courseId)
    const [firstActivity] = session.activities
    const course = courses.getById(courseId)!
    const conceptId = upsertConcept(db, 'Concreto')
    concepts.linkLessonConcept(course.modules[0].lessons[0].id, conceptId, 'primary')

    service.completeActivity(firstActivity.id, true)
    expect(mastery.get(conceptId, courseId)).toMatchObject({ score: 75, evidenceCount: 1 })

    service.completeActivity(firstActivity.id, false)
    expect(mastery.get(conceptId, courseId)).toMatchObject({ evidenceCount: 2 })
  })

  it('startRemediation throws NO_WEAK_CONCEPTS when there is no evidence of a weak concept yet', () => {
    expect(() => service.startRemediation(courseId)).toThrowError(
      expect.objectContaining({ code: 'NO_WEAK_CONCEPTS' })
    )
  })

  it('startRemediation builds a review session covering the weakest concept, even for a completed lesson', () => {
    const course = courses.getById(courseId)!
    const [lesson1, lesson2] = course.modules[0].lessons
    const conceptId = upsertConcept(db, 'Concreto')
    concepts.linkLessonConcept(lesson1.id, conceptId, 'primary')
    courses.markLessonCompleted(lesson1.id) // already completed, but still weak
    mastery.recordEvidence(conceptId, courseId, 10) // struggling: state 'learning'

    const remediation = service.startRemediation(courseId)

    expect(remediation.activities.map((a) => a.lessonId)).toContain(lesson1.id)
    expect(remediation.activities.map((a) => a.lessonId)).not.toContain(lesson2.id)
    expect(remediation.activities[0].type).toBe('review')
  })
})
