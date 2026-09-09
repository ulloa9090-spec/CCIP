import { defineConfig } from 'vitest/config'

/**
 * Opt-in, real-OpenAI verification (`pnpm test:ai-smoke`) — never wired into
 * `pnpm test`/CI (see docs/DECISIONS.md ADR-024): it needs a live
 * OPENAI_API_KEY and spends real money on every run. Its own `include` glob
 * keeps it out of `vitest.config.ts`'s `tests/unit/**` entirely.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/ai-smoke/**/*.smoke.ts']
  }
})
