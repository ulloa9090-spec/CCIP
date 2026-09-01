import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { upsertConcept } from '../../../src/main/database/repositories/conceptRepository'
import { MasteryRepository } from '../../../src/main/database/repositories/masteryRepository'

let db: Database.Database
let mastery: MasteryRepository
let conceptId: string
let courseId: string
let otherCourseId: string

function makeCourse(courses: CourseRepository, documentId: string): string {
  return courses.create({
    objective: 'Aprender',
    documentIds: [documentId],
    targetDate: null,
    dailyMinutes: 30,
    structure: {
      title: 'Curso',
      modules: [
        {
          title: 'M1',
          lessons: [{ title: 'L1', type: 'lesson', estimatedMinutes: 10, summary: 'r' }]
        }
      ]
    }
  }).id
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  mastery = new MasteryRepository(db)
  conceptId = upsertConcept(db, 'Change Orders')

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const documentId = documents.create({
    title: 'Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
  courseId = makeCourse(courses, documentId)
  otherCourseId = makeCourse(courses, documentId)
})

describe('MasteryRepository', () => {
  it('get returns null when no evidence has been recorded yet', () => {
    expect(mastery.get(conceptId, courseId)).toBeNull()
  })

  it('the first piece of evidence sets score = evidence value, evidenceCount = 1', () => {
    const result = mastery.recordEvidence(conceptId, courseId, 100)
    expect(result).toEqual({ conceptId, score: 100, state: 'mastered', evidenceCount: 1 })
  })

  it('subsequent evidence is a cumulative average, not a replacement', () => {
    mastery.recordEvidence(conceptId, courseId, 100)
    const result = mastery.recordEvidence(conceptId, courseId, 0)

    // (100*1 + 0) / 2 = 50
    expect(result).toMatchObject({ score: 50, evidenceCount: 2 })
  })

  it('derives state purely from score thresholds once there is evidence', () => {
    expect(mastery.recordEvidence(conceptId, courseId, 10).state).toBe('learning')
    expect(mastery.get(conceptId, courseId)?.state).toBe('learning')
  })

  it('crossing each threshold changes state: familiar >= 50, competent >= 75, mastered >= 90', () => {
    const cFamiliar = upsertConcept(db, 'Familiar concept')
    expect(mastery.recordEvidence(cFamiliar, courseId, 50).state).toBe('familiar')

    const cCompetent = upsertConcept(db, 'Competent concept')
    expect(mastery.recordEvidence(cCompetent, courseId, 75).state).toBe('competent')

    const cMastered = upsertConcept(db, 'Mastered concept')
    expect(mastery.recordEvidence(cMastered, courseId, 90).state).toBe('mastered')
  })

  it('listForCourse only returns scores recorded for that course', () => {
    mastery.recordEvidence(conceptId, courseId, 80)
    mastery.recordEvidence(conceptId, otherCourseId, 20)

    const list = mastery.listForCourse(courseId)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ conceptId, score: 80 })
  })

  it('tracks a concept independently per course', () => {
    mastery.recordEvidence(conceptId, courseId, 100)
    mastery.recordEvidence(conceptId, otherCourseId, 0)

    expect(mastery.get(conceptId, courseId)?.score).toBe(100)
    expect(mastery.get(conceptId, otherCourseId)?.score).toBe(0)
  })
})
