import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'

const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

/**
 * Deliberately network-independent (unlike a real grounded answer, which
 * needs both the local embedding model and OpenAI — neither reachable from
 * this sandboxed dev container, see docs/DECISIONS.md ADR-012/ADR-015): an
 * empty library resolves to Closed Library Mode's fixed no-answer message
 * without ever calling an AI provider, which is exactly what Fase 4's own
 * spec (AI_RAG.md §9) requires — a real assertion, not a workaround.
 */
test.describe('Tutor', () => {
  let userDataDir: string

  test.beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-tutor-'))
  })

  test.afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('an empty library answers with the fixed insufficient-evidence message, no sources shown', async () => {
    const app = await launch(userDataDir)
    try {
      const window = await app.firstWindow()
      await window.waitForLoadState('domcontentloaded')

      await window.getByRole('link', { name: 'Tutor IA' }).click()
      await expect(window.getByText('Pregúntale algo al Tutor')).toBeVisible()

      await window.getByPlaceholder('Escribe una pregunta...').fill('¿Qué es un change order?')
      await window.getByRole('button', { name: 'Enviar' }).click()

      await expect(
        window.getByText(
          'No encontré suficiente información en tu biblioteca para responder con confianza.'
        )
      ).toBeVisible({ timeout: 10_000 })
      await expect(window.getByText('Fuentes')).not.toBeVisible()
    } finally {
      await app.close()
    }
  })

  test('the conversation survives closing and reopening the app', async () => {
    const firstRun = await launch(userDataDir)
    const firstWindow = await firstRun.firstWindow()
    await firstWindow.waitForLoadState('domcontentloaded')

    await firstWindow.getByRole('link', { name: 'Tutor IA' }).click()
    await firstWindow.getByPlaceholder('Escribe una pregunta...').fill('¿Qué es un change order?')
    await firstWindow.getByRole('button', { name: 'Enviar' }).click()
    await expect(firstWindow.getByText('¿Qué es un change order?')).toBeVisible()
    await expect(
      firstWindow.getByText(
        'No encontré suficiente información en tu biblioteca para responder con confianza.'
      )
    ).toBeVisible({ timeout: 10_000 })
    await firstRun.close()

    const secondRun = await launch(userDataDir)
    try {
      const secondWindow = await secondRun.firstWindow()
      await secondWindow.waitForLoadState('domcontentloaded')

      await secondWindow.getByRole('link', { name: 'Tutor IA' }).click()
      await expect(secondWindow.getByText('¿Qué es un change order?')).toBeVisible()
      await expect(
        secondWindow.getByText(
          'No encontré suficiente información en tu biblioteca para responder con confianza.'
        )
      ).toBeVisible()
    } finally {
      await secondRun.close()
    }
  })
})
