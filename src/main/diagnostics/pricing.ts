/**
 * Small, explicit pricing table (ROADMAP addendum — Fase 13, §13 of the
 * diagnostics spec) — never hard-coded inline in business logic. Prices
 * are USD per million tokens, publicly listed rates as of this writing;
 * they will drift, and that's expected — this is an *estimate*, and the
 * UI must always label it as such (see docs/DECISIONS.md ADR-024).
 *
 * An unlisted provider/model combination returns `null`, not `0` — a
 * missing entry must never be silently reported as "free".
 */
export interface ModelPricing {
  provider: string
  model: string
  inputCostPerMillionTokens: number
  outputCostPerMillionTokens: number
}

const PRICING_TABLE: ModelPricing[] = [
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputCostPerMillionTokens: 0.15,
    outputCostPerMillionTokens: 0.6
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    inputCostPerMillionTokens: 2.5,
    outputCostPerMillionTokens: 10
  }
]

function findPricing(provider: string, model: string): ModelPricing | null {
  return PRICING_TABLE.find((entry) => entry.provider === provider && entry.model === model) ?? null
}

/** Returns `null` (never `0`) when the provider/model pair has no known rate. */
export function estimateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number | null {
  const pricing = findPricing(provider, model)
  if (!pricing) return null
  return (
    (inputTokens / 1_000_000) * pricing.inputCostPerMillionTokens +
    (outputTokens / 1_000_000) * pricing.outputCostPerMillionTokens
  )
}
