import { describe, expect, it } from 'vitest'
import { computeDebtCapacity } from '../debtCapacity'
import type { FinancialSummary } from '../financials'
import { fromDollars } from '../money'

const makeFinancials = (overrides: Partial<FinancialSummary> = {}): FinancialSummary => ({
  totalMonthlyRevenue: fromDollars(50000),
  totalAnnualRevenue: fromDollars(600000),
  totalMonthlyPayroll: fromDollars(25000),
  totalAnnualPayroll: fromDollars(300000),
  totalMonthlyOpex: fromDollars(10000),
  totalAnnualOpex: fromDollars(120000),
  ebitdaMonthly: fromDollars(15000),
  ebitdaAnnual: fromDollars(180000),
  ebitdaMargin: 0.3,
  cashFlowMonthly: fromDollars(15000),
  payrollPctOfRevenue: 0.5,
  opexPctOfRevenue: 0.2,
  ...overrides,
})

describe('computeDebtCapacity', () => {
  it('computes Method A (DSCR) as NOI / target DSCR', () => {
    const result = computeDebtCapacity(makeFinancials({ ebitdaAnnual: fromDollars(120000) }), 1.25, 0.15)
    expect(result.maxAnnualDebtServiceByDSCR).toBe(fromDollars(96000)) // 120000 / 1.25
  })

  it('computes Method B (target margin) as NOI minus required profit', () => {
    const result = computeDebtCapacity(makeFinancials({ ebitdaAnnual: fromDollars(120000), totalAnnualRevenue: fromDollars(600000) }), 1.25, 0.1)
    // required profit = 600000 * 0.10 = 60000; method B = 120000 - 60000 = 60000
    expect(result.maxAnnualDebtServiceByMargin).toBe(fromDollars(60000))
  })

  it('takes the more conservative (lower) of the two methods and tags which one binds', () => {
    // DSCR method is looser here (150000/1.1=136363) than margin method (150000 - 600000*0.2=30000)
    const financials = makeFinancials({ ebitdaAnnual: fromDollars(150000), totalAnnualRevenue: fromDollars(600000) })
    const marginBinding = computeDebtCapacity(financials, 1.1, 0.2)
    expect(marginBinding.bindingConstraint).toBe('TARGET_MARGIN')
    expect(marginBinding.maxAnnualDebtService).toBe(marginBinding.maxAnnualDebtServiceByMargin)

    // Now flip it: a very high DSCR requirement makes DSCR the tighter constraint.
    const dscrBinding = computeDebtCapacity(financials, 5, 0.02)
    expect(dscrBinding.bindingConstraint).toBe('DSCR')
    expect(dscrBinding.maxAnnualDebtService).toBe(dscrBinding.maxAnnualDebtServiceByDSCR)
  })

  it('never returns a negative max debt service — floors at zero instead', () => {
    const result = computeDebtCapacity(makeFinancials({ ebitdaAnnual: fromDollars(10000), totalAnnualRevenue: fromDollars(600000) }), 1.25, 0.5)
    expect(result.maxAnnualDebtService).toBe(0)
    expect(result.maxMonthlyDebtService).toBe(0)
  })

  it('does not divide by zero when target DSCR is 0 (validation should reject this upstream, but the engine must not crash)', () => {
    const result = computeDebtCapacity(makeFinancials(), 0, 0.15)
    expect(result.maxAnnualDebtServiceByDSCR).toBe(0)
    expect(Number.isFinite(result.maxAnnualDebtServiceByDSCR)).toBe(true)
  })
})
