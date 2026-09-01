import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import Database from 'better-sqlite3'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { runMigrations } from '../../src/main/database/migrations'
import { DocumentRepository } from '../../src/main/database/repositories/documentRepository'
import { CourseRepository } from '../../src/main/database/repositories/courseRepository'
import { FlashcardRepository } from '../../src/main/database/repositories/flashcardRepository'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

/**
 * Real flashcard *generation* needs `api.openai.com`, blocked in this
 * sandboxed container (same limitation as Fase 5/7's e2e suites, see
 * docs/DECISIONS.md ADR-016/018). Seeding the course and its cards directly
 * through the real repository classes — against the exact SQLite file the
 * app will open — lets this suite drive the real deck/review UI end to end
 * without that network call.
 */
function seedCourseWithFlashcards(userDataDir: string): { courseId: string; cardIds: string[] } {
  const dbPath = join(userDataDir, 'database', 'studyos.sqlite')
  mkdirSync(join(userDataDir, 'database'), { recursive: true })
  const db = new Database(dbPath)
  runMigrations(db)

  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const flashcards = new FlashcardRepository(db)

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

  const created = flashcards.createMany(course.id, [
    { front: '¿Cuál es la capital de Francia?', back: 'París', hint: 'Torre Eiffel' },
    { front: '¿Cuánto es 2 + 2?', back: '4' }
  ])
  db.close()
  return { courseId: course.id, cardIds: created.map((c) => c.id) }
}

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

test.describe('Flashcards', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-flashcards-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('shows a seeded deck from the landing page', async () => {
    seedCourseWithFlashcards(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Flashcards' }).click()
      await expect(window.getByText('Curso sembrado')).toBeVisible()
      await expect(window.getByText('2 tarjetas')).toBeVisible()

      await window.getByText('Curso sembrado').click()
      await expect(window.getByText('¿Cuál es la capital de Francia?')).toBeVisible()
      await expect(window.getByText('París')).toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('reviews a deck front-to-back and rating a card removes it from the due queue', async () => {
    const { courseId } = seedCourseWithFlashcards(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.evaluate((id) => {
        globalThis.location.hash = `#/flashcards/${id}/review`
      }, courseId)

      await expect(window.getByText('1 / 2')).toBeVisible()
      await expect(window.getByText('¿Cuál es la capital de Francia?')).toBeVisible()
      await window.getByRole('button', { name: 'Mostrar respuesta' }).click()
      await expect(window.getByText('París')).toBeVisible()
      await expect(window.getByText('Pista: Torre Eiffel')).toBeVisible()
      await window.getByRole('button', { name: 'Bien' }).click()

      await expect(window.getByText('2 / 2')).toBeVisible()
      await expect(window.getByText('¿Cuánto es 2 + 2?')).toBeVisible()
      await window.getByRole('button', { name: 'Mostrar respuesta' }).click()
      await window.getByRole('button', { name: 'Fácil' }).click()

      await expect(window.getByText('¡Repaso completo!')).toBeVisible()

      // Both cards were just rated with a positive outcome (interval > 0
      // days), so neither should still show up as due today.
      await window.evaluate((id) => {
        globalThis.location.hash = `#/flashcards/${id}`
      }, courseId)
      await expect(window.getByRole('button', { name: /Repasar ahora/ })).not.toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('creates a manual flashcard from the deck view', async () => {
    const { courseId } = seedCourseWithFlashcards(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.evaluate((id) => {
        globalThis.location.hash = `#/flashcards/${id}`
      }, courseId)

      await window.getByRole('button', { name: '+ Nueva tarjeta' }).click()
      await window.getByPlaceholder('Pregunta / término (front)').fill('¿Qué es SQLite?')
      await window
        .getByPlaceholder('Respuesta / definición (back)')
        .fill('Una base de datos embebida')
      await window.getByRole('button', { name: 'Guardar tarjeta' }).click()

      await expect(window.getByText('¿Qué es SQLite?')).toBeVisible()
      await expect(window.getByText('3 tarjetas')).toBeVisible()
    } finally {
      await app.close()
    }
  })

  test("generating flashcards without an OpenAI key surfaces the app's normal error", async () => {
    const { courseId } = seedCourseWithFlashcards(userDataDir)
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.evaluate((id) => {
        globalThis.location.hash = `#/flashcards/${id}`
      }, courseId)
      await window.getByRole('button', { name: 'Generar más con IA' }).click()

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
