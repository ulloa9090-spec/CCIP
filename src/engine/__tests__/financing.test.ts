import { describe, expect, it } from 'vitest'
import { monthlyPaymentForLoan } from '../amortization'
import { averageWeightedRate, computeEquityCheck, computeFinancingStructure, computeSourcesAndUses } from '../financing'
import { fromDollars } from '../money'
import type { FinancingTranche } from '../types'

const tranche = (overrides: Partial<FinancingTranche> = {}): FinancingTranche => ({
  id: 't1',
  label: 'Bank First Lien',
  amount: fromDollars(400000),
  ratePct: 0.075,
  amortizationYears: 25,
  feesPct: 0.02,
  ...overrides,
})

describe('computeFinancingStructure', () => {
  it('computes the monthly payment for each tranche using the amortization formula', () => {
    const t = tranche()
    const result = computeFinancingStructure([t])
    expect(result.byTranche[0].monthlyPayment).toBe(monthlyPaymentForLoan(t.amount, t.ratePct, t.amortizationYears))
  })

  it('sums payments and amounts across multiple tranches (SBA 504-style bank + CDC)', () => {
    const bank = tranche({ id: 'bank', amount: fromDollars(250000), ratePct: 0.08, amortizationYears: 25 })
    const cdc = tranche({ id: 'cdc', amount: fromDollars(200000), ratePct: 0.055, amortizationYears: 25 })
    const result = computeFinancingStructure([bank, cdc])
    expect(result.totalFinanced).toBe(fromDollars(450000))
    expect(result.combinedMonthlyPayment).toBe(result.byTranche[0].monthlyPayment + result.byTranche[1].monthlyPayment)
  })

  it('computes an estimated fee as a % of tranche amount, informational only', () => {
    const result = computeFinancingStructure([tranche({ amount: fromDollars(100000), feesPct: 0.03 })])
    expect(result.byTranche[0].estimatedFee).toBe(fromDollars(3000))
  })

  it('returns all zeros for an empty tranche list', () => {
    const result = computeFinancingStructure([])
    expect(result.totalFinanced).toBe(0)
    expect(result.combinedMonthlyPayment).toBe(0)
  })
})

describe('computeSourcesAndUses', () => {
  it('reports isBalanced when sources exactly equal uses', () => {
    const result = computeSourcesAndUses(
      fromDollars(100000),
      [tranche({ amount: fromDollars(400000) })],
      fromDollars(450000),
      [{ label: 'Renovation', amount: fromDollars(30000) }],
      fromDollars(20000),
    )
    expect(result.totalSources).toBe(fromDollars(500000))
    expect(result.totalUses).toBe(fromDollars(500000))
    expect(result.gap).toBe(0)
    expect(result.isBalanced).toBe(true)
  })

  it('reports a positive gap (FUNDING GAP) when uses exceed sources — never hides it', () => {
    const result = computeSourcesAndUses(
      fromDollars(50000),
      [tranche({ amount: fromDollars(300000) })],
      fromDollars(450000),
      [{ label: 'Renovation', amount: fromDollars(30000) }],
      fromDollars(20000),
    )
    expect(result.gap).toBeGreaterThan(0)
    expect(result.isBalanced).toBe(false)
  })

  it('treats a null property price as zero (no property selected yet)', () => {
    const result = computeSourcesAndUses(fromDollars(50000), [], null, [], fromDollars(0))
    expect(result.uses.find((u) => u.label === 'Property Purchase')?.amount).toBe(0)
  })
})

describe('computeEquityCheck', () => {
  it('flags a shortfall when available equity is below the required percentage', () => {
    const result = computeEquityCheck(fromDollars(500000), 0.1, fromDollars(30000))
    expect(result.requiredEquity).toBe(fromDollars(50000))
    expect(result.isEquityShortfall).toBe(true)
    expect(result.equityGap).toBe(fromDollars(20000))
  })

  it('floors the gap at zero when equity exceeds the requirement', () => {
    const result = computeEquityCheck(fromDollars(500000), 0.1, fromDollars(100000))
    expect(result.isEquityShortfall).toBe(false)
    expect(result.equityGap).toBe(0)
  })
})

describe('averageWeightedRate', () => {
  it('weights each tranche rate by its share of total financing', () => {
    const bank = tranche({ amount: fromDollars(300000), ratePct: 0.09 })
    const cdc = tranche({ amount: fromDollars(200000), ratePct: 0.05 })
    // weighted: 0.09*0.6 + 0.05*0.4 = 0.074
    expect(averageWeightedRate([bank, cdc])).toBeCloseTo(0.074)
  })

  it('returns 0 for no tranches instead of dividing by zero', () => {
    expect(averageWeightedRate([])).toBe(0)
  })
})
