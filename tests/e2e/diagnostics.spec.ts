import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page
} from '@playwright/test'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

/** See polish.spec.ts — a single 'Control+k' combo string doesn't reliably deliver ctrlKey through Electron's CDP input pipeline. */
async function pressCtrlK(window: Page): Promise<void> {
  await window.keyboard.down('Control')
  await window.keyboard.press('k')
  await window.keyboard.up('Control')
}

/**
 * Fase 13 (Developer Diagnostics) — no live OpenAI calls here (see
 * DECISIONS.md ADR-012/ADR-015, same constraint as tutor.spec.ts): an empty
 * library resolves entirely offline (Closed Library Mode), which is exactly
 * enough to exercise every screen this phase adds without needing a real
 * provider or seeded documents.
 */
test.describe('Developer Diagnostics', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-diagnostics-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('every tab renders real (non-crashing) data, reachable from Settings and the command palette', async () => {
    const app = await launch(userDataDir)
    const consoleErrors: string[] = []
    try {
      const window = await app.firstWindow()
      window.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Configuración' }).click()
      await window.getByRole('link', { name: 'Abrir Diagnóstico de Desarrollador' }).click()
      await expect(window.getByText('Diagnóstico de Desarrollador')).toBeVisible()

      // System Health (default tab) — a fresh install with no OpenAI key.
      await expect(window.getByText('Base de datos local')).toBeVisible()
      await expect(window.getByText('No se ha configurado una clave de API.')).toBeVisible()

      await window.getByRole('button', { name: 'Uso de IA' }).click()
      await expect(window.getByText('Latencia promedio')).toBeVisible()

      await window.getByRole('button', { name: 'Inspector de recuperación' }).click()
      await expect(window.getByPlaceholder('Escribe una consulta de prueba...')).toBeVisible()

      await window.getByRole('button', { name: 'Historial de solicitudes' }).click()
      await expect(window.getByText('Aún no hay solicitudes registradas')).toBeVisible()

      await window.getByRole('button', { name: 'Salud de documentos' }).click()
      await expect(window.getByText('Sin documentos')).toBeVisible()

      expect(consoleErrors, `unexpected console errors: ${consoleErrors.join('\n')}`).toEqual([])
    } finally {
      await app.close()
    }
  })

  test('the privacy toggle persists across a restart', async () => {
    const firstRun = await launch(userDataDir)
    const firstWindow = await firstRun.firstWindow()
    await firstWindow.waitForLoadState('domcontentloaded')

    await firstWindow.getByRole('link', { name: 'Configuración' }).click()
    await firstWindow.getByRole('link', { name: 'Abrir Diagnóstico de Desarrollador' }).click()
    await expect(firstWindow.getByRole('button', { name: 'Activado' })).toBeVisible()
    await firstWindow.getByRole('button', { name: 'Activado' }).click()
    await expect(firstWindow.getByRole('button', { name: 'Desactivado' })).toBeVisible()
    await firstRun.close()

    const secondRun = await launch(userDataDir)
    try {
      const secondWindow = await secondRun.firstWindow()
      await secondWindow.waitForLoadState('domcontentloaded')
      await secondWindow.getByRole('link', { name: 'Configuración' }).click()
      await secondWindow.getByRole('link', { name: 'Abrir Diagnóstico de Desarrollador' }).click()
      await expect(secondWindow.getByRole('button', { name: 'Desactivado' })).toBeVisible()
    } finally {
      await secondRun.close()
    }
  })

  test('a Tutor abstention shows "¿Por qué?" and links to a real, traced request', async () => {
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Tutor IA' }).click()
      await window.getByPlaceholder('Escribe una pregunta...').fill('¿Qué es un change order?')
      await window.getByRole('button', { name: 'Enviar' }).click()
      await expect(
        window.getByText(
          'No encontré suficiente información en tu biblioteca para responder con confianza.'
        )
      ).toBeVisible({ timeout: 10_000 })

      await window.getByRole('button', { name: '¿Por qué?' }).click()
      await expect(
        window.getByText('Tu biblioteca todavía no tiene documentos importados.')
      ).toBeVisible()

      await window.getByRole('link', { name: 'Ver detalles técnicos' }).click()
      await expect(window.getByText('Diagnóstico de Desarrollador')).toBeVisible()
      await expect(window.getByText('Cronología')).toBeVisible()
      await expect(window.getByText('QUESTION_RECEIVED')).toBeVisible()
      await expect(
        window.getByText('NO_INDEXED_DOCUMENTS — DocumentRepository.list()', { exact: false })
      ).toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('the command palette can jump straight to Developer Diagnostics', async () => {
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')
      await window.getByRole('button', { name: 'Abrir paleta de comandos' }).waitFor()

      await pressCtrlK(window)
      await window.getByLabel('Buscar comando').fill('Diagnóstico')
      await window.keyboard.press('Enter')

      await expect(window.getByText('Diagnóstico de Desarrollador').first()).toBeVisible()
    } finally {
      await app.close()
    }
  })
})
