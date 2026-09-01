import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import {
  ConceptRepository,
  upsertConcept
} from '../../../src/main/database/repositories/conceptRepository'
import { MasteryRepository } from '../../../src/main/database/repositories/masteryRepository'
import { MasteryService } from '../../../src/main/mastery/masteryService'

let db: Database.Database
let concepts: ConceptRepository
let mastery: MasteryRepository
let service: MasteryService
let courseId: string
let lessonId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  concepts = new ConceptRepository(db)
  mastery = new MasteryRepository(db)
  service = new MasteryService(concepts, mastery)

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
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
    structure: {
      title: 'Curso',
      modules: [
        {
          title: 'M1',
          lessons: [{ title: 'L1', type: 'lesson', estimatedMinutes: 10, summary: 'r' }]
        }
      ]
    }
  })
  courseId = course.id
  lessonId = course.modules[0].lessons[0].id
})

describe('MasteryService', () => {
  it('recordLessonEvidence records "understood" as strong-ish evidence for every concept the lesson covers', () => {
    const a = upsertConcept(db, 'Concept A')
    const b = upsertConcept(db, 'Concept B')
    concepts.linkLessonConcept(lessonId, a, 'primary')
    concepts.linkLessonConcept(lessonId, b, 'secondary')

    service.recordLessonEvidence(courseId, lessonId, true)

    expect(mastery.get(a, courseId)).toMatchObject({ score: 75, evidenceCount: 1 })
    expect(mastery.get(b, courseId)).toMatchObject({ score: 75, evidenceCount: 1 })
  })

  it('recordLessonEvidence records "needs review" as weaker evidence', () => {
    const a = upsertConcept(db, 'Concept A')
    concepts.linkLessonConcept(lessonId, a, 'primary')

    service.recordLessonEvidence(courseId, lessonId, false)

    expect(mastery.get(a, courseId)).toMatchObject({ score: 25 })
  })

  it('recordLessonEvidence is a no-op when the lesson has no linked concepts', () => {
    expect(() => service.recordLessonEvidence(courseId, lessonId, true)).not.toThrow()
  })

  it('recordQuestionEvidence records correct/incorrect as 100/0, and is a no-op with no concept', () => {
    const a = upsertConcept(db, 'Concept A')
    service.recordQuestionEvidence(courseId, a, true)
    expect(mastery.get(a, courseId)).toMatchObject({ score: 100 })

    service.recordQuestionEvidence(courseId, a, false)
    expect(mastery.get(a, courseId)).toMatchObject({ score: 50, evidenceCount: 2 })

    expect(() => service.recordQuestionEvidence(courseId, null, true)).not.toThrow()
  })

  it('getCourseMastery fills in "new" with score 0 for concepts with no evidence yet', () => {
    const a = upsertConcept(db, 'Concept A')
    concepts.linkLessonConcept(lessonId, a, 'primary')

    const result = service.getCourseMastery(courseId)

    expect(result.concepts).toEqual([
      { conceptId: a, title: 'Concept A', score: 0, state: 'new', evidenceCount: 0, sources: [] }
    ])
  })

  it('weakConcepts includes "new" and "learning" but not "familiar" or better, "learning" ranked first', () => {
    const learning = upsertConcept(db, 'Learning concept')
    const brandNew = upsertConcept(db, 'New concept')
    const familiar = upsertConcept(db, 'Familiar concept')
    for (const id of [learning, brandNew, familiar]) {
      concepts.linkLessonConcept(lessonId, id, 'primary')
    }
    mastery.recordEvidence(learning, courseId, 10)
    mastery.recordEvidence(familiar, courseId, 60)
    // brandNew: no evidence recorded at all -> state 'new'

    const weak = service.getCourseMastery(courseId).weakConcepts

    expect(weak.map((c) => c.conceptId)).toEqual([learning, brandNew])
  })

  it('weakConcepts sorts multiple "learning" concepts by ascending score', () => {
    const worse = upsertConcept(db, 'Worse concept')
    const better = upsertConcept(db, 'Better concept')
    concepts.linkLessonConcept(lessonId, worse, 'primary')
    concepts.linkLessonConcept(lessonId, better, 'primary')
    mastery.recordEvidence(worse, courseId, 5)
    mastery.recordEvidence(better, courseId, 40)

    const weak = service.getCourseMastery(courseId).weakConcepts

    expect(weak.map((c) => c.conceptId)).toEqual([worse, better])
  })
})
