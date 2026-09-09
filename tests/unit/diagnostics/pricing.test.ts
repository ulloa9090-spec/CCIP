import { describe, expect, it } from 'vitest'
import { estimateCost } from '../../../src/main/diagnostics/pricing'

describe('estimateCost', () => {
  it('computes cost from the known per-million-token rates', () => {
    // gpt-4o-mini: $0.15 input / $0.6 output per million tokens
    const cost = estimateCost('openai', 'gpt-4o-mini', 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(0.15 + 0.6, 6)
  })

  it('scales linearly with token counts', () => {
    const cost = estimateCost('openai', 'gpt-4o-mini', 500_000, 0)
    expect(cost).toBeCloseTo(0.075, 6)
  })

  it('returns null (never 0) for an unknown model, so an unpriced call is never reported as free', () => {
    expect(estimateCost('openai', 'gpt-9000-experimental', 1000, 1000)).toBeNull()
  })

  it('returns null for an unknown provider even with a known model name', () => {
    expect(estimateCost('anthropic', 'gpt-4o-mini', 1000, 1000)).toBeNull()
  })

  it('returns 0 (a real answer, not null) for a known model with zero usage', () => {
    expect(estimateCost('openai', 'gpt-4o-mini', 0, 0)).toBe(0)
  })
})
