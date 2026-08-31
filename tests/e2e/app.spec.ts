import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'

/**
 * `--no-sandbox` is passed only for this CI/dev-container launch (this repo
 * runs in a sandboxed Linux container with no real display); the shipped
 * app never disables the Chromium sandbox — see docs/DECISIONS.md ADR-006.
 * Requires `pnpm build` to have produced `out/main/index.js`.
 */
const MAIN_ENTRY = join(__dirname, '../../out/main/index.js')

async function launch(userDataDir: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [MAIN_ENTRY, '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: { ...process.env, NODE_ENV: 'production' }
  })
}

test('main window opens with the StudyOS shell', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-shell-'))
  const app = await launch(userDataDir)

  try {
    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await expect(window).toHaveTitle('StudyOS')
    await expect(window.getByText('STUDYOS')).toBeVisible()
    await expect(window.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  } finally {
    await app.close()
    rmSync(userDataDir, { recursive: true, force: true })
  }
})

test('display name saved in Settings survives closing and reopening the app', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-persistence-'))

  try {
    const firstRun = await launch(userDataDir)
    const firstWindow = await firstRun.firstWindow()
    await firstWindow.waitForLoadState('domcontentloaded')

    await firstWindow.getByRole('link', { name: 'Configuración' }).click()
    const nameInput = firstWindow.getByPlaceholder('Tu nombre')
    await nameInput.fill('Luis Ulloa')
    await firstWindow.getByRole('button', { name: 'Guardar' }).first().click()
    await expect(firstWindow.getByText(/Última actualización/)).toBeVisible()
    await firstRun.close()

    const secondRun = await launch(userDataDir)
    const secondWindow = await secondRun.firstWindow()
    await secondWindow.waitForLoadState('domcontentloaded')

    await secondWindow.getByRole('link', { name: 'Configuración' }).click()
    await expect(secondWindow.getByPlaceholder('Tu nombre')).toHaveValue('Luis Ulloa')
    await secondRun.close()
  } finally {
    rmSync(userDataDir, { recursive: true, force: true })
  }
})
