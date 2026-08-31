import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import type { CourseStructure } from '../../../src/main/courses/courseGenerationSchema'

let db: Database.Database
let documents: DocumentRepository
let courses: CourseRepository
let documentId: string

const structure: CourseStructure = {
  title: 'Curso de prueba',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [
        { title: 'Lección 1', type: 'lesson', estimatedMinutes: 15, summary: 'Resumen 1' },
        { title: 'Lección 2', type: 'practice', estimatedMinutes: 20, summary: 'Resumen 2' }
      ]
    },
    {
      title: 'Módulo 2',
      lessons: [
        { title: 'Lección 3', type: 'assessment', estimatedMinutes: 30, summary: 'Resumen 3' }
      ]
    }
  ]
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
  documentId = documents.create({
    title: 'Michigan Builder Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
})

describe('CourseRepository', () => {
  it('persists a generated structure as nested courses/modules/lessons', () => {
    const course = courses.create({
      objective: 'Aprobar el examen',
      documentIds: [documentId],
      targetDate: '2026-09-30',
      dailyMinutes: 30,
      structure
    })

    expect(course.title).toBe('Curso de prueba')
    expect(course.objective).toBe('Aprobar el examen')
    expect(course.targetDate).toBe('2026-09-30')
    expect(course.dailyMinutes).toBe(30)
    expect(course.status).toBe('active')
    expect(course.progress).toBe(0)
    expect(course.documentIds).toEqual([documentId])
    expect(course.modules).toHaveLength(2)
    expect(course.modules[0].lessons).toHaveLength(2)
    expect(course.modules[0].estimatedMinutes).toBe(35)
    expect(course.modules[1].lessons[0].type).toBe('assessment')
    expect(course.modules[0].lessons[0].status).toBe('not_started')
  })

  it('list orders courses by creation time, most recent first', () => {
    const first = courses.create({
      objective: 'A',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 10,
      structure
    })
    const second = courses.create({
      objective: 'B',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 10,
      structure
    })

    expect(courses.list().map((c) => c.id)).toEqual([second.id, first.id])
  })

  it('getById returns null for an unknown course', () => {
    expect(courses.getById('missing')).toBeNull()
  })

  it('deleting the source document cascades to course_documents but leaves the course', () => {
    const course = courses.create({
      objective: 'A',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 10,
      structure
    })
    documents.delete(documentId)

    const reloaded = courses.getById(course.id)
    expect(reloaded).not.toBeNull()
    expect(reloaded?.documentIds).toEqual([])
  })
})
