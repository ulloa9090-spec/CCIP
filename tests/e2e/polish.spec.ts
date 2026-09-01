import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
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

/**
 * `page.keyboard.press('Control+k')` as a single combo string does not
 * reliably deliver a `ctrlKey: true` keydown through Electron's CDP input
 * pipeline — an explicit down/press/up sequence does.
 */
async function pressCtrlK(window: Page): Promise<void> {
  await window.keyboard.down('Control')
  await window.keyboard.press('k')
  await window.keyboard.up('Control')
}

test.describe('Fase 12 — Polish', () => {
  let userDataDir: string
  let app: ElectronApplication
  let window: Page

  test.beforeEach(async () => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-polish-'))
    app = await launch(userDataDir)
    window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')
    // Wait for AppShell (and its Ctrl+K listener) to actually be mounted —
    // `domcontentloaded` alone can fire before React finishes its first
    // render, which flakes the keyboard-shortcut tests below.
    await window.getByRole('button', { name: 'Abrir paleta de comandos' }).waitFor()
  })

  test.afterEach(async () => {
    await app.close()
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('Ctrl+K opens the command palette, filtering and Enter navigate', async () => {
    await pressCtrlK(window)
    await expect(window.getByRole('dialog', { name: 'Paleta de comandos' })).toBeVisible()

    await window.getByLabel('Buscar comando').fill('flashcards')
    await expect(window.getByText('Ir a Flashcards')).toBeVisible()
    await expect(window.getByText('Ir a Configuración')).not.toBeVisible()

    await window.keyboard.press('Enter')
    await expect(window.getByRole('dialog')).not.toBeVisible()
    await expect(window.getByRole('heading', { name: 'Flashcards' })).toBeVisible()
  })

  test('Escape closes the command palette without navigating', async () => {
    await pressCtrlK(window)
    await expect(window.getByRole('dialog')).toBeVisible()

    await window.keyboard.press('Escape')
    await expect(window.getByRole('dialog')).not.toBeVisible()
    await expect(window.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  })

  test('the topbar button also opens the command palette', async () => {
    await window.getByRole('button', { name: 'Abrir paleta de comandos' }).click()
    await expect(window.getByRole('dialog', { name: 'Paleta de comandos' })).toBeVisible()
  })

  test('switching to light theme applies it immediately and it survives restart', async () => {
    await window.getByRole('link', { name: 'Configuración' }).click()
    await expect(window.locator('html')).toHaveAttribute('data-theme', 'dark')

    await window.getByRole('button', { name: 'Claro' }).click()
    await expect(window.locator('html')).toHaveAttribute('data-theme', 'light')
    await app.close()

    const secondRun = await launch(userDataDir)
    try {
      const secondWindow = await secondRun.firstWindow()
      await secondWindow.waitForLoadState('domcontentloaded')
      await expect(secondWindow.locator('html')).toHaveAttribute('data-theme', 'light')
    } finally {
      await secondRun.close()
    }
  })

  test('creates a real backup folder with a database copy', async () => {
    await window.getByRole('link', { name: 'Configuración' }).click()
    await window.getByRole('button', { name: 'Crear copia de seguridad' }).click()

    await expect(window.getByText(/Copia creada en:/)).toBeVisible({ timeout: 10_000 })
    const messageText = await window.getByText(/Copia creada en:/).textContent()
    const backupPath = messageText?.replace('Copia creada en: ', '').trim()
    expect(backupPath).toBeTruthy()
    expect(existsSync(join(backupPath!, 'studyos.sqlite'))).toBe(true)
  })

  test('exports notes to a Markdown file via the save dialog', async () => {
    // Seed a note directly through the real app flow: Tutor doesn't take
    // notes, so use Study Mode's note panel would need a course — simplest
    // path is seeding via IPC directly from the renderer, same effect as a
    // real user typing into NotesPanel without needing a full course setup.
    await window.evaluate(async () => {
      await globalThis.studyos.notes.create({ body: 'Nota de prueba para exportar' })
    })

    const exportPath = join(userDataDir, 'nota-exportada.md')
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath })
    }, exportPath)

    await window.getByRole('link', { name: 'Configuración' }).click()
    await window.getByRole('button', { name: 'Exportar notas (.md)' }).click()

    await expect(window.getByText(/Notas exportadas a/)).toBeVisible({ timeout: 10_000 })
    expect(existsSync(exportPath)).toBe(true)
    expect(readFileSync(exportPath, 'utf-8')).toContain('Nota de prueba para exportar')
  })
})
