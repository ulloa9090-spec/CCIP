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

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

/**
 * Mastery's real signal comes from actually taking lessons/quizzes, which
 * this suite already covers elsewhere. Here it's seeded directly (same
 * pattern as Fase 5/6/7's e2e suites) so the test can start from a known
 * "one weak concept, one brand-new concept" state without depending on a
 * real OpenAI-generated course.
 */
function seedCourseWithConcepts(userDataDir: string): void {
  const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
  mkdirSync(join(userDataDir, 'database'), { recursive: true })
  const db = new Database(dbPath)
  runMigrations(db)

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const concepts = new ConceptRepository(db)
  const mastery = new MasteryRepository(db)

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

  const conceptA = upsertConcept(db, 'Concepto Débil')
  const conceptB = upsertConcept(db, 'Concepto Nuevo')
  concepts.linkLessonConcept(lessonA.id, conceptA, 'primary')
  concepts.linkLessonConcept(lessonB.id, conceptB, 'primary')
  mastery.recordEvidence(conceptA, course.id, 30) // struggling: state 'learning'
  // conceptB gets no evidence at all -> state 'new'

  db.close()
}

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

test.describe('Mastery', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-mastery-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('shows concept states on the course page and builds a remediation session for the weakest one', async () => {
    seedCourseWithConcepts(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Mis Cursos' }).click()
      await window.getByText('Curso sembrado').click()

      await expect(window.getByText('Concepto Débil')).toBeVisible()
      await expect(window.getByText('Aprendiendo')).toBeVisible()
      await expect(window.getByText('Concepto Nuevo')).toBeVisible()
      await expect(window.getByText('Sin evidencia')).toBeVisible()

      await window.getByRole('button', { name: 'Crear sesión de recuperación' }).click()

      // "learning" (Concepto Débil / Lección A) outranks "new" (Concepto Nuevo / Lección B).
      await expect(window.getByRole('heading', { name: 'Lección A' })).toBeVisible()

      // Marking it understood updates mastery immediately — no need to
      // finish the whole session (it also covers Lección B, the other
      // weak concept's lesson).
      await window.getByRole('button', { name: 'Entendido' }).click()

      await window.getByRole('link', { name: 'Mis Cursos' }).click()
      await window.getByText('Curso sembrado').click()

      // 30 (seeded) + 75 (Entendido) averaged = 53 -> crosses into "familiar".
      await expect(window.getByText('Familiar')).toBeVisible()
    } finally {
      await app.close()
    }
  })
})
