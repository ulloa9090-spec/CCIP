import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { NoteRepository } from '../../../src/main/database/repositories/noteRepository'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import type { CourseStructure } from '../../../src/main/courses/courseGenerationSchema'

let db: Database.Database
let notes: NoteRepository
let documents: DocumentRepository
let courses: CourseRepository
let courseId: string

const structure: CourseStructure = {
  title: 'Curso',
  modules: [
    {
      title: 'Módulo 1',
      lessons: [{ title: 'Lección 1', type: 'lesson', estimatedMinutes: 10, summary: 'Resumen' }]
    }
  ]
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  notes = new NoteRepository(db)
  documents = new DocumentRepository(db)
  courses = new CourseRepository(db)
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

describe('NoteRepository', () => {
  it('creates a note scoped to a course and lists it back', () => {
    const note = notes.create({ body: 'Recordar revisar el capítulo 3', courseId })

    expect(note.body).toBe('Recordar revisar el capítulo 3')
    expect(note.courseId).toBe(courseId)
    expect(note.title).toBeNull()
    expect(notes.listByCourse(courseId)).toHaveLength(1)
  })

  it('lists notes most-recent first and scoped to the given course', () => {
    notes.create({ body: 'Nota A', courseId })
    const second = notes.create({ body: 'Nota B', courseId })

    const list = notes.listByCourse(courseId)
    expect(list[0].id).toBe(second.id)
  })

  it('does not leak notes from other courses', () => {
    const documentId = documents.create({
      title: 'Otro manual',
      originalFilename: 'otro.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    }).id
    const otherCourseId = courses.create({
      objective: 'Otro',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 30,
      structure
    }).id

    notes.create({ body: 'Nota del curso 1', courseId })
    notes.create({ body: 'Nota del curso 2', courseId: otherCourseId })

    expect(notes.listByCourse(courseId)).toHaveLength(1)
    expect(notes.listByCourse(otherCourseId)).toHaveLength(1)
  })

  it('delete removes the note', () => {
    const note = notes.create({ body: 'Temporal', courseId })
    notes.delete(note.id)
    expect(notes.listByCourse(courseId)).toEqual([])
  })

  it('listAll returns every note across courses with the course title attached', () => {
    const documentId = documents.create({
      title: 'Otro manual',
      originalFilename: 'otro.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    }).id
    const otherCourseId = courses.create({
      objective: 'Otro',
      documentIds: [documentId],
      targetDate: null,
      dailyMinutes: 30,
      structure
    }).id

    notes.create({ body: 'Nota del curso 1', courseId })
    notes.create({ body: 'Nota del curso 2', courseId: otherCourseId })
    notes.create({ body: 'Nota sin curso' })

    const all = notes.listAll()
    expect(all).toHaveLength(3)
    expect(all.find((n) => n.body === 'Nota del curso 1')?.courseTitle).toBe('Curso')
    expect(all.find((n) => n.body === 'Nota sin curso')?.courseTitle).toBeNull()
  })
})
