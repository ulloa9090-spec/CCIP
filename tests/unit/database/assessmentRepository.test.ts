import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../../src/main/database/repositories/courseRepository'
import { QuestionRepository } from '../../../src/main/database/repositories/questionRepository'
import { AssessmentRepository } from '../../../src/main/database/repositories/assessmentRepository'
import type { QuizStructure } from '../../../src/main/assessment/quizGenerationSchema'

let db: Database.Database
let assessments: AssessmentRepository
let courseId: string
let questionIds: string[]

const quiz: QuizStructure = {
  questions: [
    {
      prompt: 'Q1',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 0,
      explanation: 'e1',
      difficulty: 'easy'
    },
    {
      prompt: 'Q2',
      choices: ['a', 'b', 'c', 'd'],
      correctIndex: 1,
      explanation: 'e2',
      difficulty: 'medium'
    }
  ]
}

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const questions = new QuestionRepository(db)
  assessments = new AssessmentRepository(db)
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
  questionIds = questions.createMany(courseId, quiz).map((q) => q.id)
})

describe('AssessmentRepository', () => {
  it('creates an attempt with one unanswered slot per question, in order', () => {
    const attemptId = assessments.createAttempt(courseId, 'quiz', questionIds)

    expect(assessments.getQuestionIdsInOrder(attemptId)).toEqual(questionIds)
    expect(assessments.getAnswers(attemptId).size).toBe(0)
    const meta = assessments.getAttemptMeta(attemptId)
    expect(meta?.completedAt).toBeNull()
    expect(meta?.totalQuestions).toBe(2)
    expect(meta?.courseTitle).toBe('Curso')
  })

  it('submitAnswer records the choice and whether it was correct, and can be resubmitted', () => {
    const attemptId = assessments.createAttempt(courseId, 'quiz', questionIds)

    assessments.submitAnswer(attemptId, questionIds[0], 2, false)
    expect(assessments.getAnswers(attemptId).get(questionIds[0])).toEqual({
      choiceIndex: 2,
      isCorrect: false
    })

    assessments.submitAnswer(attemptId, questionIds[0], 0, true)
    expect(assessments.getAnswers(attemptId).get(questionIds[0])).toEqual({
      choiceIndex: 0,
      isCorrect: true
    })
  })

  it('finishAttempt computes score/correct_count/duration and stamps completed_at', () => {
    const attemptId = assessments.createAttempt(courseId, 'quiz', questionIds)
    assessments.submitAnswer(attemptId, questionIds[0], 0, true)
    assessments.submitAnswer(attemptId, questionIds[1], 3, false)

    assessments.finishAttempt(attemptId)

    const meta = assessments.getAttemptMeta(attemptId)
    expect(meta?.completedAt).not.toBeNull()
    expect(meta?.score).toBe(50)
    expect(meta?.correctCount).toBe(1)
    expect(meta?.durationSeconds).toBeGreaterThanOrEqual(1)
  })

  it('unanswered questions count as incorrect when finished', () => {
    const attemptId = assessments.createAttempt(courseId, 'quiz', questionIds)
    assessments.submitAnswer(attemptId, questionIds[0], 0, true)
    // questionIds[1] left unanswered

    assessments.finishAttempt(attemptId)

    const meta = assessments.getAttemptMeta(attemptId)
    expect(meta?.score).toBe(50)
    expect(meta?.correctCount).toBe(1)
  })

  it('getPreviousAverageScore excludes the given attempt and ignores unfinished ones', () => {
    const first = assessments.createAttempt(courseId, 'quiz', questionIds)
    assessments.submitAnswer(first, questionIds[0], 0, true)
    assessments.submitAnswer(first, questionIds[1], 1, true)
    assessments.finishAttempt(first) // 100%

    const second = assessments.createAttempt(courseId, 'quiz', questionIds)
    assessments.submitAnswer(second, questionIds[0], 2, false)
    assessments.submitAnswer(second, questionIds[1], 2, false)
    // second left unfinished on purpose

    expect(assessments.getPreviousAverageScore(courseId, second)).toBe(100)
  })

  it('listHistory only includes completed attempts, most recent first', () => {
    const attemptId = assessments.createAttempt(courseId, 'quiz', questionIds)
    expect(assessments.listHistory()).toEqual([])

    assessments.finishAttempt(attemptId)
    const history = assessments.listHistory()
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ id: attemptId, courseId, courseTitle: 'Curso' })
  })
})
