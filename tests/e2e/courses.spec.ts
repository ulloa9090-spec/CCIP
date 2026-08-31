import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')
const FIXTURE_PDF = join(__dirname, '../fixtures/sample.pdf')

async function launch(userDataDir: string): Promise<ElectronApplication> {
  const app = await electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
  }, FIXTURE_PDF)
  return app
}

/**
 * Real course generation needs `api.openai.com`, unreachable from this
 * sandboxed dev container (same limitation as Fase 4, see
 * docs/DECISIONS.md ADR-015) — so this suite verifies everything that
 * doesn't need it: the wizard's own navigation/validation, and that a
 * missing API key produces the app's normal AppError message end to end
 * instead of a crash, exactly like the rest of the app is expected to
 * degrade without a configured key.
 */
test.describe('Crear curso', () => {
  let userDataDir: string
  let app: ElectronApplication

  test.beforeEach(async () => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-courses-'))
    app = await launch(userDataDir)
  })

  test.afterEach(async () => {
    await app.close()
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('the wizard walks through all 5 steps and surfaces the missing-API-key error on submit', async () => {
    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await window.getByRole('link', { name: 'Biblioteca' }).click()
    await window.getByRole('button', { name: '+ Agregar documento' }).first().click()
    await expect(window.getByText('Listo')).toBeVisible({ timeout: 20_000 })

    await window.getByRole('link', { name: 'Mis Cursos' }).click()
    await expect(window.getByText('Todavía no tienes cursos')).toBeVisible()
    await window.getByRole('button', { name: '+ Crear curso' }).first().click()

    // Paso 1 — Objetivo
    await expect(window.getByText('Paso 1 de 5')).toBeVisible()
    await expect(window.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await window.getByLabel('¿Qué quieres lograr?').fill('Aprobar el examen de contratista')
    await window.getByRole('button', { name: 'Siguiente' }).click()

    // Paso 2 — Material
    await expect(window.getByText('Paso 2 de 5')).toBeVisible()
    await expect(window.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await window.getByText('sample').click()
    await window.getByRole('button', { name: 'Siguiente' }).click()

    // Paso 3 — Tiempo
    await expect(window.getByText('Paso 3 de 5')).toBeVisible()
    await window.getByRole('button', { name: 'Siguiente' }).click()

    // Paso 4 — Estilo
    await expect(window.getByText('Paso 4 de 5')).toBeVisible()
    await window.getByText('Práctico').click()
    await window.getByRole('button', { name: 'Siguiente' }).click()

    // Paso 5 — Confirmación
    await expect(window.getByText('Paso 5 de 5')).toBeVisible()
    await expect(window.getByText('Aprobar el examen de contratista')).toBeVisible()
    await expect(window.getByText(/sample/)).toBeVisible()

    await window.getByRole('button', { name: 'Crear curso' }).click()
    await expect(
      window.getByText(
        'Configura tu clave de OpenAI en Configuración > AI Provider para usar la IA.'
      )
    ).toBeVisible({ timeout: 10_000 })
  })

  test('"Crear curso" from a document detail page pre-selects that document', async () => {
    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await window.getByRole('link', { name: 'Biblioteca' }).click()
    await window.getByRole('button', { name: '+ Agregar documento' }).first().click()
    await expect(window.getByText('Listo')).toBeVisible({ timeout: 20_000 })
    await window.getByRole('link', { name: /sample/ }).click()

    await window.getByRole('button', { name: 'Crear curso' }).click()
    await expect(window.getByText('Paso 1 de 5')).toBeVisible()
    await window.getByLabel('¿Qué quieres lograr?').fill('Repasar el manual')
    await window.getByRole('button', { name: 'Siguiente' }).click()

    await expect(window.getByRole('checkbox')).toBeChecked()
  })
})
