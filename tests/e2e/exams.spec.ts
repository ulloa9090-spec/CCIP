import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { runMigrations } from '../../src/main/database/migrations'
import { DocumentRepository } from '../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../src/main/database/repositories/courseRepository'
import { QuestionRepository } from '../../src/main/database/repositories/questionRepository'
import { AssessmentRepository } from '../../src/main/database/repositories/assessmentRepository'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

/**
 * Real quiz *generation* needs `api.openai.com`, blocked in this sandboxed
 * container (same limitation as Fase 5, ADR-016). Seeding the course and
 * its questions directly through the real repository classes — against the
 * exact SQLite file the app will open — lets this suite drive the real
 * question player and results screen end to end without that network call.
 */
function seedCourseWithQuestions(userDataDir: string): { courseId: string; attemptId: string } {
  const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
  mkdirSync(join(userDataDir, 'database'), { recursive: true })
  const db = new Database(dbPath)
  runMigrations(db)

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const questions = new QuestionRepository(db)
  const assessments = new AssessmentRepository(db)

  const documentId = documents.create({
    title: 'Manual de prueba',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'seed-hash'
  }).id
  const course = courses.create({
    objective: 'Aprobar el examen',
    documentIds: [documentId],
    targetDate: null,
    dailyMinutes: 30,
    structure: {
      title: 'Curso sembrado',
      modules: [
        {
          title: 'Módulo 1',
          lessons: [
            { title: 'Lección A', type: 'lesson', estimatedMinutes: 10, summary: 'Resumen' }
          ]
        }
      ]
    }
  })

  const created = questions.createMany(course.id, {
    questions: [
      {
        prompt: '¿Cuál es la capital de Francia?',
        choices: ['Madrid', 'París', 'Roma', 'Berlín'],
        correctIndex: 1,
        explanation: 'París es la capital de Francia.',
        difficulty: 'easy'
      },
      {
        prompt: '¿Cuánto es 2 + 2?',
        choices: ['3', '4', '5', '6'],
        correctIndex: 1,
        explanation: '2 + 2 = 4.',
        difficulty: 'easy'
      }
    ]
  })

  const attemptId = assessments.createAttempt(
    course.id,
    'quiz',
    created.map((q) => q.id)
  )
  db.close()
  return { courseId: course.id, attemptId }
}

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

test.describe('Exámenes', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-exams-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('takes a seeded quiz end to end and sees the scored results', async () => {
    const { attemptId } = seedCourseWithQuestions(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      // Jumps straight into the player for the seeded attempt — the app's
      // own generation flow is covered separately (missing-API-key test
      // below), this test exercises the player/scoring/results UI itself.
      await window.evaluate((id) => {
        globalThis.location.hash = `#/exams/${id}`
      }, attemptId)

      await expect(window.getByText('¿Cuál es la capital de Francia?')).toBeVisible()
      await window.getByRole('radio').nth(1).check() // "París" — correct
      await window.getByRole('button', { name: 'Siguiente' }).click()

      await expect(window.getByText('¿Cuánto es 2 + 2?')).toBeVisible()
      await window.getByRole('radio').nth(0).check() // "3" — incorrect
      await window.getByRole('button', { name: 'Finalizar examen' }).click()

      await expect(window.getByText('50%')).toBeVisible()
      await expect(window.getByText('1 de 2 correctas')).toBeVisible()
      await expect(window.getByText('París es la capital de Francia.')).toBeVisible()

      await window.getByRole('link', { name: 'Volver a Exámenes' }).click()
      await expect(window.getByText('Curso sembrado').first()).toBeVisible()
      await expect(window.getByText('50%')).toBeVisible()
    } finally {
      await app.close()
    }
  })

  test("generating a quiz without an OpenAI key surfaces the app's normal error", async () => {
    seedCourseWithQuestions(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Exámenes' }).click()
      await window.getByRole('button', { name: 'Nuevo examen' }).click()

      await expect(
        window.getByText(
          'Configura tu clave de OpenAI en Configuración > AI Provider para usar la IA.'
        )
      ).toBeVisible({ timeout: 10_000 })
    } finally {
      await app.close()
    }
  })
})
