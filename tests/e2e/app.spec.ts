import { test, expect, _electron as electron } from '@playwright/test'
import { join } from 'path'

/**
 * Phase 0 smoke test: the packaged main entry launches a window titled
 * "StudyOS" and the shell renders without a render-time error.
 *
 * Requires `pnpm build` to have produced `out/main/index.js`.
 * `--no-sandbox` is passed only for this CI/dev-container launch (this repo
 * runs in a sandboxed Linux container with no real display); the shipped
 * app never disables the Chromium sandbox — see docs/DECISIONS.md ADR-006.
 */
test('main window opens with the StudyOS shell', async () => {
  const app = await electron.launch({
    args: [join(__dirname, '../../out/main/index.js'), '--no-sandbox'],
    env: { ...process.env, NODE_ENV: 'production' }
  })

  const window = await app.firstWindow()
  await window.waitForLoadState('domcontentloaded')

  await expect(window).toHaveTitle('StudyOS')
  await expect(window.getByText('STUDYOS')).toBeVisible()
  await expect(window.getByRole('heading', { name: 'Inicio' })).toBeVisible()

  await app.close()
})
