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
  // Electron's native file picker has no DOM to drive; stubbing it in the
  // main process (Playwright's documented pattern for this) is the only way
  // to exercise the real import IPC flow end to end.
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
  }, FIXTURE_PDF)
  return app
}

test.describe('Biblioteca', () => {
  let userDataDir: string
  let app: ElectronApplication

  test.beforeEach(async () => {
    userDataDir = mkdtempSync(join(tmpdir(), 'studyos-e2e-library-'))
    app = await launch(userDataDir)
  })

  test.afterEach(async () => {
    await app.close()
    rmSync(userDataDir, { recursive: true, force: true })
  })

  test('import, view, and delete a PDF end to end', async () => {
    const window = await app.firstWindow()
    await window.waitForLoadState('domcontentloaded')

    await window.getByRole('link', { name: 'Biblioteca' }).click()
    await expect(window.getByText('Tu biblioteca está vacía')).toBeVisible()

    await window.getByRole('button', { name: '+ Agregar documento' }).first().click()
    await expect(window.getByText('Listo')).toBeVisible({ timeout: 20_000 })

    await window.getByRole('link', { name: /sample/ }).click()
    await expect(window.getByRole('heading', { name: 'sample' })).toBeVisible()
    await expect(window.getByText('3 páginas')).toBeVisible()

    // Outline comes from the PDF's own bookmarks (see extractPdf.ts) —
    // fixture has three, one per page.
    await expect(window.getByText('Concrete Basics')).toBeVisible()
    await expect(window.getByText('Framing Overview')).toBeVisible()
    await expect(window.getByText('Electrical Fundamentals')).toBeVisible()

    // The canvas must have actually painted pixels, not just exist with a
    // size — this is what caught the real Map.getOrInsertComputed bug
    // (ADR-009): the canvas had a size but was garbage/blank.
    const canvas = window.locator('[data-testid="pdf-canvas"]')
    await expect(canvas).toBeVisible()
    const pixelInfo = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d')!
      const data = ctx.getImageData(0, 0, el.width, el.height).data
      let nonWhite = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) nonWhite++
      }
      return nonWhite
    })
    expect(pixelInfo).toBeGreaterThan(0)

    await expect(window.getByText('Página 1 de 3')).toBeVisible()
    await window.getByRole('button', { name: 'Siguiente' }).click()
    await expect(window.getByText('Página 2 de 3')).toBeVisible()

    window.once('dialog', (dialog) => dialog.accept())
    await window.getByRole('button', { name: 'Eliminar' }).click()
    await expect(window).toHaveURL(/#\/library$/)
    await expect(window.getByText('Tu biblioteca está vacía')).toBeVisible()
  })
})
