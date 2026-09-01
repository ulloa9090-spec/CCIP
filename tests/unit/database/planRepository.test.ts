import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { PlanRepository } from '../../../src/main/database/repositories/planRepository'

let db: Database.Database
let plans: PlanRepository
let courseId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  plans = new PlanRepository(db)
  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
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
})

describe('PlanRepository', () => {
  it('getLatest returns null when no plan has been created yet', () => {
    expect(plans.getLatest(courseId)).toBeNull()
  })

  it('create persists a plan and getLatest returns it', () => {
    const created = plans.create(courseId, '2026-01-01', '2026-01-10', 30, [
      { date: '2026-01-01', lessonIds: ['l1'], estimatedMinutes: 10 }
    ])

    expect(created.version).toBe(1)
    const latest = plans.getLatest(courseId)
    expect(latest).toEqual(created)
  })

  it('each create increments the version instead of overwriting the previous one', () => {
    const first = plans.create(courseId, '2026-01-01', '2026-01-10', 30, [])
    const second = plans.create(courseId, '2026-01-02', '2026-01-15', 45, [])

    expect(first.version).toBe(1)
    expect(second.version).toBe(2)
    expect(plans.getLatest(courseId)).toEqual(second)
  })

  it('scopes plans per course', () => {
    const documents = new DocumentRepository(db)
    const courses = new CourseRepository(db)
    const otherDocumentId = documents.create({
      title: 'Otro manual',
      originalFilename: 'otro.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    }).id
    const otherCourseId = courses.create({
      objective: 'Otro',
      documentIds: [otherDocumentId],
      targetDate: null,
      dailyMinutes: 30,
      structure: {
        title: 'Otro curso',
        modules: [
          {
            title: 'M1',
            lessons: [{ title: 'L1', type: 'lesson', estimatedMinutes: 10, summary: 'r' }]
          }
        ]
      }
    }).id

    plans.create(courseId, '2026-01-01', '2026-01-10', 30, [])
    expect(plans.getLatest(otherCourseId)).toBeNull()
  })
})
