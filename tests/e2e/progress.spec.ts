import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { runMigrations } from '../../src/main/database/migrations'
import { DocumentRepository } from '../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../src/main/database/repositories/courseRepository'
import {
  ConceptRepository,
  upsertConcept
} from '../../src/main/database/repositories/conceptRepository'
import { MasteryRepository } from '../../src/main/database/repositories/masteryRepository'
import { StudySessionRepository } from '../../src/main/database/repositories/studySessionRepository'
import { QuestionRepository } from '../../src/main/database/repositories/questionRepository'
import { AssessmentRepository } from '../../src/main/database/repositories/assessmentRepository'
import { FlashcardRepository } from '../../src/main/database/repositories/flashcardRepository'
import { DocumentChunkRepository } from '../../src/main/database/repositories/documentChunkRepository'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

/**
 * Progreso (Fase 11) aggregates data from every earlier phase (Study Mode,
 * Assessment, Mastery, Flashcards) instead of tracking anything new, so
 * seeding it means seeding all of those directly through the real
 * repository classes — same pattern as every e2e suite since Fase 5.
 */
function seedActivity(userDataDir: string): { courseId: string } {
  const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
  mkdirSync(join(userDataDir, 'database'), { recursive: true })
  const db = new Database(dbPath)
  runMigrations(db)

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const concepts = new ConceptRepository(db)
  const mastery = new MasteryRepository(db)
  const sessions = new StudySessionRepository(db)
  const questions = new QuestionRepository(db)
  const assessments = new AssessmentRepository(db)
  const flashcards = new FlashcardRepository(db)
  const chunks = new DocumentChunkRepository(db)

  const documentId = documents.create({
    title: 'Manual de prueba',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'seed-hash'
  }).id
  chunks.replaceChunks(documentId, [
    {
      text: 'Contenido citable.',
      pageStart: 2,
      pageEnd: 2,
      heading: null,
      tokenCount: 3,
      embedding: [1, 0]
    }
  ])
  const course = courses.create({
    objective: 'Aprobar el examen',
    documentIds: [documentId],
    targetDate: null,
    dailyMinutes: 60,
    structure: {
      title: 'Curso sembrado',
      modules: [
        {
          title: 'Módulo 1',
          lessons: [
            { title: 'Lección A', type: 'lesson', estimatedMinutes: 10, summary: 'Resumen A' },
            { title: 'Lección B', type: 'lesson', estimatedMinutes: 10, summary: 'Resumen B' }
          ]
        }
      ]
    }
  })
  const [lessonA, lessonB] = course.modules[0].lessons

  const conceptWeak = upsertConcept(db, 'Concepto Débil')
  concepts.linkLessonConcept(lessonA.id, conceptWeak, 'primary')
  concepts.linkLessonConcept(lessonB.id, upsertConcept(db, 'Concepto Nuevo'), 'primary')
  mastery.recordEvidence(conceptWeak, course.id, 30) // 'learning'
  const chunkId = db
    .prepare('SELECT id FROM document_chunks WHERE document_id = ?')
    .get(documentId) as {
    id: string
  }
  concepts.addSource(conceptWeak, chunkId.id, 1)

  // Study time + streak.
  const sessionId = sessions.create(course.id, [{ lessonId: lessonA.id }], 10)
  sessions.completeSession(sessionId)

  // Exam history.
  const createdQuestions = questions.createMany(course.id, {
    questions: [
      {
        prompt: '¿Cuál es la capital de Francia?',
        choices: ['Madrid', 'París', 'Roma', 'Berlín'],
        correctIndex: 1,
        explanation: 'París es la capital de Francia.',
        difficulty: 'easy'
      }
    ]
  })
  const attemptId = assessments.createAttempt(
    course.id,
    'quiz',
    createdQuestions.map((q) => q.id)
  )
  assessments.submitAnswer(attemptId, createdQuestions[0].id, 1, true)
  assessments.finishAttempt(attemptId)

  // Flashcard reviews.
  const [card] = flashcards.createMany(course.id, [{ front: 'Q', back: 'A' }])
  flashcards.addReview(card.id, 'good', 1, 2.5, '2000-01-01')

  db.close()
  return { courseId: course.id }
}

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

test.describe('Progreso', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-progress-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('shows the dashboard with real aggregated stats', async () => {
    seedActivity(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Progreso' }).click()

      await expect(window.getByText('🔥 1 días')).toBeVisible()
      await expect(window.getByText('100%', { exact: true }).first()).toBeVisible() // quiz accuracy
      await expect(window.getByText('Curso sembrado').first()).toBeVisible() // dominio por tema
      await expect(window.getByText('Concepto Nuevo')).toBeVisible() // conceptos en riesgo
      await expect(window.getByText('1 preguntas')).toBeVisible() // exam history entry
    } finally {
      await app.close()
    }
  })

  test('an empty library shows the empty state instead of a zeroed dashboard', async () => {
    const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
    mkdirSync(join(userDataDir, 'database'), { recursive: true })
    const db = new Database(dbPath)
    runMigrations(db)
    db.close()

    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Progreso' }).click()
      await expect(window.getByText('Todavía no hay progreso que mostrar')).toBeVisible()
    } finally {
      await app.close()
    }
  })
})

test.describe('Mapa de Conocimiento', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-knowledge-map-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('shows the concept tree per course and expands a node to reveal its sources', async () => {
    seedActivity(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Mapa de Conocimiento' }).click()
      await expect(window.getByText('Curso sembrado')).toBeVisible()
      await expect(window.getByText('Concepto Débil')).toBeVisible()
      await expect(window.getByText('Aprendiendo')).toBeVisible()

      await window.getByText('Concepto Débil').click()
      await expect(window.getByText('Manual de prueba · p. 2')).toBeVisible()

      await window.getByRole('button', { name: 'Estudiar ahora' }).click()
      await expect(window.getByRole('heading', { name: 'Lección A' })).toBeVisible()
    } finally {
      await app.close()
    }
  })
})
