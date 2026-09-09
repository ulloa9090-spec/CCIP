import { defineConfig } from 'vitest/config'

/**
 * Fase 13's Evaluation Lab (`pnpm eval`) — Recall@k/MRR, correct-abstention,
 * citation accuracy, groundedness and prompt-injection resistance, all
 * offline/deterministic (see tests/eval/fixtures.ts). Kept in its own
 * config/`include` glob, separate from `vitest.config.ts`'s `tests/unit/**`,
 * so it never runs twice under plain `pnpm test` and never needs jsdom.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/eval/**/*.eval.ts']
  }
})
