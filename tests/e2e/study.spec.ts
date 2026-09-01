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
 * Study Mode needs a real course (modules/lessons), which needs a real
 * Course Engine generation — blocked here by the same `api.openai.com`
 * restriction as Fase 5 (ADR-016). Seeding the course directly through the
 * real repository classes (not hand-written SQL) against the exact SQLite
 * file the app itself will open (`<userDataDir>/database/studyos.sqlite`)
 * lets this suite exercise the real Study Mode code end to end without
 * depending on that network call.
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

test.describe('Study Mode', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-study-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('estudiar, cerrar, abrir, continuar: resumes at the next lesson across app restarts', async () => {
    // dailyMinutes = 20 caps each session to exactly one 20-minute lesson.
    seedCourse(userDataDir, 20)

    const firstRun = await launch(userDataDir)
    const firstWindow = await firstRun.firstWindow()
    await firstWindow.waitForLoadState('domcontentloaded')

    await firstWindow.getByRole('link', { name: 'Estudiar' }).click()
    await expect(firstWindow.getByText('Curso sembrado')).toBeVisible()
    await firstWindow.getByRole('button', { name: 'Continuar' }).click()

    await expect(firstWindow.getByRole('heading', { name: 'Lección A' })).toBeVisible()
    await firstWindow.getByRole('button', { name: 'Entendido' }).click()
    await firstWindow.getByRole('button', { name: 'Continuar →' }).click()
    await expect(firstWindow.getByText('¡Sesión completada!')).toBeVisible()
    await firstRun.close()

    const secondRun = await launch(userDataDir)
    try {
      const secondWindow = await secondRun.firstWindow()
      await secondWindow.waitForLoadState('domcontentloaded')

      await secondWindow.getByRole('link', { name: 'Estudiar' }).click()
      await secondWindow.getByRole('button', { name: 'Continuar' }).click()

      // Resuming must land on Lección B, not re-offer the already-completed Lección A.
      await expect(secondWindow.getByRole('heading', { name: 'Lección B' })).toBeVisible()
      await expect(secondWindow.getByRole('heading', { name: 'Lección A' })).not.toBeVisible()
    } finally {
      await secondRun.close()
    }
  })

  test('completing every lesson brings the course to 100% and marks it completed', async () => {
    seedCourse(userDataDir, 60) // large budget: all 3 lessons in one session
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Estudiar' }).click()
      await window.getByRole('button', { name: 'Continuar' }).click()

      for (const title of ['Lección A', 'Lección B', 'Lección C']) {
        await expect(window.getByRole('heading', { name: title })).toBeVisible()
        await window.getByRole('button', { name: 'Entendido' }).click()
        await window.getByRole('button', { name: 'Continuar →' }).click()
      }

      await expect(window.getByText('¡Sesión completada!')).toBeVisible()
      await window.getByRole('link', { name: 'Volver al curso' }).click()
      await expect(window.getByText('100%')).toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('a note taken while studying shows up on the course detail page', async () => {
    seedCourse(userDataDir, 60)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Estudiar' }).click()
      await window.getByRole('button', { name: 'Continuar' }).click()

      await window.getByRole('button', { name: '+ Nota' }).click()
      await window
        .getByPlaceholder('Escribe una nota rápida...')
        .fill('Repasar esto antes del examen')
      await window.getByRole('button', { name: 'Guardar' }).click()
      await expect(window.getByText('Repasar esto antes del examen')).toBeVisible()

      await window.getByRole('link', { name: 'Mis Cursos' }).click()
      await window.getByText('Curso sembrado').click()
      await expect(window.getByText('Repasar esto antes del examen')).toBeVisible()
    } finally {
      await app.close()
    }
  })
})
