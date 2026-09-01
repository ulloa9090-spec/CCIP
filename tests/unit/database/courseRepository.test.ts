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

  it('listPendingLessons excludes completed lessons and orders by module/lesson position', () => {
    const course = courses.create({
      objective: 'A',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 60,
      structure
    })
    courses.markLessonCompleted(course.modules[0].lessons[0].id)

    const pending = courses.listPendingLessons(course.id)

    expect(pending.map((l) => l.title)).toEqual(['Lección 2', 'Lección 3'])
  })

  it('markLessonCompleted marks the module completed once all its lessons are done', () => {
    const course = courses.create({
      objective: 'A',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 60,
      structure
    })
    const [lesson1, lesson2] = course.modules[0].lessons

    courses.markLessonCompleted(lesson1.id)
    expect(courses.getById(course.id)?.modules[0].status).toBe('in_progress')

    courses.markLessonCompleted(lesson2.id)
    expect(courses.getById(course.id)?.modules[0].status).toBe('completed')
  })

  it('markLessonCompleted recomputes course progress and flips status to completed at 100%', () => {
    const course = courses.create({
      objective: 'A',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 60,
      structure
    })
    const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id))

    courses.markLessonCompleted(allLessonIds[0])
    let reloaded = courses.getById(course.id)
    expect(reloaded?.progress).toBe(33)
    expect(reloaded?.status).toBe('active')

    allLessonIds.slice(1).forEach((id) => courses.markLessonCompleted(id))
    reloaded = courses.getById(course.id)
    expect(reloaded?.progress).toBe(100)
    expect(reloaded?.status).toBe('completed')
  })

  it('markLessonInProgress escalates not_started but never downgrades a completed lesson', () => {
    const course = courses.create({
      objective: 'A',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 60,
      structure
    })
    const lessonId = course.modules[0].lessons[0].id

    courses.markLessonInProgress(lessonId)
    expect(courses.getById(course.id)?.modules[0].lessons[0].status).toBe('in_progress')

    courses.markLessonCompleted(lessonId)
    courses.markLessonInProgress(lessonId)
    expect(courses.getById(course.id)?.modules[0].lessons[0].status).toBe('completed')
  })
})
