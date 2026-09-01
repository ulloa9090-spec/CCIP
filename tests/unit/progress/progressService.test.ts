import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { StudySessionRepository } from '../../../src/main/database/repositories/studySessionRepository'
import { AssessmentRepository } from '../../../src/main/database/repositories/assessmentRepository'
import { QuestionRepository } from '../../../src/main/database/repositories/questionRepository'
import { FlashcardRepository } from '../../../src/main/database/repositories/flashcardRepository'
import {
  ConceptRepository,
  upsertConcept
} from '../../../src/main/database/repositories/conceptRepository'
import { MasteryRepository } from '../../../src/main/database/repositories/masteryRepository'
import { MasteryService } from '../../../src/main/mastery/masteryService'
import { ProgressService, computeStreak } from '../../../src/main/progress/progressService'
import type { CourseStructure } from '../../../src/main/courses/courseGenerationSchema'

describe('computeStreak', () => {
  it('counts consecutive days ending today when today has activity', () => {
    const dates = new Set(['2026-01-08', '2026-01-07', '2026-01-06'])
    expect(computeStreak(dates, new Date('2026-01-08T15:00:00Z'))).toBe(3)
  })

  it('still counts the streak as alive when today has no activity yet, but yesterday does', () => {
    const dates = new Set(['2026-01-07', '2026-01-06'])
    expect(computeStreak(dates, new Date('2026-01-08T08:00:00Z'))).toBe(2)
  })

  it('resets to 0 once a day is skipped', () => {
    const dates = new Set(['2026-01-05', '2026-01-01'])
    expect(computeStreak(dates, new Date('2026-01-08T08:00:00Z'))).toBe(0)
  })

  it('returns 0 for an empty history', () => {
    expect(computeStreak(new Set(), new Date('2026-01-08T08:00:00Z'))).toBe(0)
  })
})

const structure: CourseStructure = {
  title: 'Curso',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [{ title: 'Lección 1', type: 'lesson', estimatedMinutes: 15, summary: 'r' }]
    }
  ]
}

let db: Database.Database
let courses: CourseRepository
let sessions: StudySessionRepository
let assessments: AssessmentRepository
let questions: QuestionRepository
let flashcards: FlashcardRepository
let service: ProgressService
let courseId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  const documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
  sessions = new StudySessionRepository(db)
  assessments = new AssessmentRepository(db)
  questions = new QuestionRepository(db)
  flashcards = new FlashcardRepository(db)
  const mastery = new MasteryService(new ConceptRepository(db), new MasteryRepository(db))
  service = new ProgressService(courses, sessions, assessments, flashcards, mastery)

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
    dailyMinutes: 30,
    structure
  }).id
})

describe('ProgressService', () => {
  it('returns zeroed/empty defaults with no activity recorded yet', () => {
    const summary = service.getSummary()

    expect(summary.activeCourseCount).toBe(1)
    expect(summary.completedCourseCount).toBe(0)
    expect(summary.averageProgress).toBe(0)
    expect(summary.totalStudyMinutes).toBe(0)
    expect(summary.quizAccuracy).toBeNull()
    expect(summary.flashcardAccuracy).toBeNull()
    expect(summary.currentStreakDays).toBe(0)
    expect(summary.courseMastery).toEqual([])
    expect(summary.conceptsAtRisk).toEqual([])
    expect(summary.examHistory).toEqual([])
  })

  it('counts active vs completed courses separately', () => {
    const documents = new DocumentRepository(db)
    const otherDocumentId = documents.create({
      title: 'Otro',
      originalFilename: 'otro.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    }).id
    const otherCourse = courses.create({
      objective: 'Otro',
      documentIds: [otherDocumentId],
      targetDate: null,
      dailyMinutes: 30,
      structure
    })
    courses.markLessonCompleted(otherCourse.modules[0].lessons[0].id)

    const summary = service.getSummary()
    expect(summary.activeCourseCount).toBe(1)
    expect(summary.completedCourseCount).toBe(1)
  })

  it('aggregates quiz accuracy across finished attempts and exposes the exam history', () => {
    const created = questions.createMany(courseId, {
      questions: [
        {
          prompt: 'Q1',
          choices: ['a', 'b', 'c', 'd'],
          correctIndex: 0,
          explanation: 'e',
          difficulty: 'easy'
        }
      ]
    })
    const attemptId = assessments.createAttempt(
      courseId,
      'quiz',
      created.map((q) => q.id)
    )
    assessments.submitAnswer(attemptId, created[0].id, 0, true)
    assessments.finishAttempt(attemptId)

    const summary = service.getSummary()
    expect(summary.quizAccuracy).toBe(100)
    expect(summary.examHistory).toHaveLength(1)
    expect(summary.examHistory[0].courseTitle).toBe('Curso')
  })

  it('computes flashcard accuracy as the share of good/easy ratings', () => {
    const [card] = flashcards.createMany(courseId, [{ front: 'Q', back: 'A' }])
    flashcards.addReview(card.id, 'good', 1, 2.5, '2026-01-02')
    flashcards.addReview(card.id, 'again', 1, 2.3, '2026-01-03')

    expect(service.getSummary().flashcardAccuracy).toBe(50)
  })

  it('surfaces courseMastery and conceptsAtRisk from MasteryService, weakest first', () => {
    const course = courses.getById(courseId)!
    const lessonId = course.modules[0].lessons[0].id
    const conceptId = upsertConcept(db, 'Concepto débil')
    new ConceptRepository(db).linkLessonConcept(lessonId, conceptId, 'primary')

    const summary = service.getSummary()
    expect(summary.courseMastery).toEqual([{ courseId, courseTitle: 'Curso', averageScore: 0 }])
    expect(summary.conceptsAtRisk).toHaveLength(1)
    expect(summary.conceptsAtRisk[0]).toMatchObject({
      courseId,
      courseTitle: 'Curso',
      conceptId,
      state: 'new'
    })
  })

  it('reflects real study time recorded by Study Mode sessions', () => {
    const course = courses.getById(courseId)!
    const lessonId = course.modules[0].lessons[0].id
    const sessionId = sessions.create(courseId, [{ lessonId }], 15)
    sessions.completeSession(sessionId)

    expect(service.getSummary().totalStudyMinutes).toBeGreaterThanOrEqual(1)
  })
})
