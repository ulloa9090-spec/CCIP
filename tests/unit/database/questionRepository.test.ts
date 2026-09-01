import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { QuestionRepository } from '../../../src/main/database/repositories/questionRepository'
import type { QuizStructure } from '../../../src/main/assessment/quizGenerationSchema'

let db: Database.Database
let questions: QuestionRepository
let courseId: string

const quiz: QuizStructure = {
  questions: [
    {
      prompt: '¿Qué es el concreto?',
      choices: ['Un metal', 'Un material compuesto', 'Un polímero', 'Una madera'],
      correctIndex: 1,
      explanation: 'El concreto es un material compuesto de cemento, agua y agregados.',
      difficulty: 'easy'
    },
    {
      prompt: '¿Cuál es la resistencia típica del concreto?',
      choices: ['1000 psi', '3000 psi', '10000 psi', '50 psi'],
      correctIndex: 1,
      explanation: 'El concreto estructural típico ronda los 3000 psi.',
      difficulty: 'medium'
    }
  ]
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  questions = new QuestionRepository(db)
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

describe('QuestionRepository', () => {
  it('persists a quiz structure and returns questions in the same order', () => {
    const created = questions.createMany(courseId, quiz)

    expect(created).toHaveLength(2)
    expect(created[0].prompt).toBe('¿Qué es el concreto?')
    expect(created[0].choices).toEqual([
      'Un metal',
      'Un material compuesto',
      'Un polímero',
      'Una madera'
    ])
    expect(created[0].correctIndex).toBe(1)
    expect(created[0].type).toBe('multiple_choice')
    expect(created[0].sourceRefs).toEqual([])
  })

  it('getByIds returns questions in the requested id order and skips unknown ids', () => {
    const created = questions.createMany(courseId, quiz)
    const reordered = questions.getByIds([created[1].id, created[0].id, 'missing'])

    expect(reordered.map((q) => q.id)).toEqual([created[1].id, created[0].id])
  })

  it('setSourceRefs attaches citations retrievable afterwards', () => {
    const [question] = questions.createMany(courseId, quiz)
    questions.setSourceRefs(question.id, [
      { documentId: 'doc-1', documentTitle: 'Manual', pageStart: 5, pageEnd: 5 }
    ])

    const [reloaded] = questions.getByIds([question.id])
    expect(reloaded.sourceRefs).toEqual([
      { documentId: 'doc-1', documentTitle: 'Manual', pageStart: 5, pageEnd: 5 }
    ])
  })
})
