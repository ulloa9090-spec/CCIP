import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { runMigrations } from '../../src/main/database/migrations'
import { DocumentRepository } from '../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../src/main/database/repositories/courseRepository'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

/**
 * Plan generation is deterministic (no AI, see docs/DECISIONS.md Fase 9
 * ADR), so unlike Fase 5/7's e2e suites this isn't working around a
 * network limitation — seeding directly just keeps the test independent
 * of Course Engine's own (already-covered) generation flow.
 */
function seedCourse(userDataDir: string, dailyMinutes: number): string {
  const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
  mkdirSync(join(userDataDir, 'database'), { recursive: true })
  const db = new Database(dbPath)
  runMigrations(db)

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
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
    dailyMinutes,
    structure: {
      title: 'Curso sembrado',
      modules: [
        {
          title: 'Módulo 1',
          lessons: [
            { title: 'Lección A', type: 'lesson', estimatedMinutes: 20, summary: 'Resumen A' },
            { title: 'Lección B', type: 'lesson', estimatedMinutes: 20, summary: 'Resumen B' },
            { title: 'Lección C', type: 'lesson', estimatedMinutes: 20, summary: 'Resumen C' }
          ]
        }
      ]
    }
  })
  db.close()
  return course.id
}

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

test.describe('Plan de Estudio', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-plan-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('shows a day-by-day schedule, lets you change the goal, and hands off to Study Mode', async () => {
    seedCourse(userDataDir, 20) // 20 min/day budget, 20 min/lesson -> one lesson per day
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Plan de Estudio' }).click()
      await expect(window.getByText('Curso sembrado')).toBeVisible()
      await window.getByRole('button', { name: 'Ver plan' }).click()

      await expect(window.getByText('Hoy')).toBeVisible()
      await expect(window.getByText('Próxima').first()).toBeVisible()
      await expect(window.getByText('Lección A')).toBeVisible()

      // Cambiar meta: a much bigger daily budget should fit everything in one day on recalculation.
      await window.getByRole('button', { name: 'Cambiar meta' }).click()
      await window.getByLabel('Minutos por día').fill('100')
      await window.getByRole('button', { name: 'Guardar' }).click()

      await expect(window.getByText('Lección A')).toBeVisible()
      await expect(window.getByText('Lección B')).toBeVisible()
      await expect(window.getByText('Lección C')).toBeVisible()
      await expect(window.getByText('Próxima')).not.toBeVisible()

      await window.getByRole('button', { name: 'Recalcular plan' }).click()
      await expect(window.getByText('Hoy')).toBeVisible()

      await window.getByRole('link', { name: 'Ir a estudiar' }).click()
      await expect(window.getByRole('heading', { name: 'Lección A' })).toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('a course whose lessons are all done shows no pending days', async () => {
    const courseId = seedCourse(userDataDir, 60)
    const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
    const db = new Database(dbPath)
    const courses = new CourseRepository(db)
    const course = courses.getById(courseId)!
    for (const lesson of course.modules[0].lessons) {
      courses.markLessonCompleted(lesson.id)
    }
    db.close()

    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      // A finished course no longer shows on the Plan landing (same
      // active-only filter as Study Mode's landing) — its plan is still
      // reachable directly, same as visiting any other course's plan.
      await window.evaluate((id) => {
        globalThis.location.hash = `#/plan/${id}`
      }, courseId)

      await expect(window.getByText('No quedan lecciones pendientes en este curso.')).toBeVisible()
    } finally {
      await app.close()
    }
  })
})
