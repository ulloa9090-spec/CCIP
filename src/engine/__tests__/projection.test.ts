import { describe, expect, it } from 'vitest'
import type { FinancialSummary } from '../financials'
import { fromDollars } from '../money'
import { computeAnnualProjection } from '../projection'
import type { FinancingTranche, Project } from '../types'

const makeFinancials = (overrides: Partial<FinancialSummary> = {}): FinancialSummary => ({
  totalMonthlyRevenue: fromDollars(50000),
  totalAnnualRevenue: fromDollars(600000),
  totalMonthlyPayroll: fromDollars(25000),
  totalAnnualPayroll: fromDollars(300000),
  totalMonthlyOpex: fromDollars(8000),
  totalAnnualOpex: fromDollars(96000),
  ebitdaMonthly: fromDollars(17000),
  ebitdaAnnual: fromDollars(204000),
  ebitdaMargin: 0.34,
  cashFlowMonthly: fromDollars(17000),
  payrollPctOfRevenue: 0.5,
  opexPctOfRevenue: 0.16,
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 60,
  ageGroups: [],
  payrollLineItems: [],
  expenseItems: [],
  staffCoverageBufferPct: 0.15,
  targetDSCR: 1.25,
  targetProfitMarginPct: 0.15,
  loanInterestRatePct: 0.075,
  loanAmortizationYears: 25,
  negotiationBufferPct: 0.1,
  ownerEquityAvailable: fromDollars(150000),
  workingCapitalMonths: 3,
  projectCostLineItems: [],
  financingType: 'CUSTOM',
  financingTranches: [],
  requiredEquityPct: 0.1,
  properties: [],
  selectedPropertyId: null,
  scenarios: [],
  activeScenarioId: 'base',
  projectionAssumptions: { tuitionGrowthPct: 0.03, expenseInflationPct: 0.02, wageGrowthPct: 0.04 },
  leaseTerms: { baseRentMonthly: 0 as never, nnnMonthly: 0 as never, annualEscalationPct: 0.03, termYears: 5, securityDepositMonths: 2, tenantImprovementAllowance: 0 as never },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('computeAnnualProjection', () => {
  it('produces exactly 5 years', () => {
    const result = computeAnnualProjection(makeProject(), makeFinancials())
    expect(result.years).toHaveLength(5)
    expect(result.years.map((y) => y.year)).toEqual([1, 2, 3, 4, 5])
  })

  it('year 1 equals the current stabilized financials (no growth applied yet)', () => {
    const financials = makeFinancials()
    const result = computeAnnualProjection(makeProject(), financials)
    expect(result.years[0].revenue).toBe(financials.totalAnnualRevenue)
    expect(result.years[0].payroll).toBe(financials.totalAnnualPayroll)
    expect(result.years[0].opex).toBe(financials.totalAnnualOpex)
  })

  it('compounds revenue, payroll, and opex independently at their own growth rates', () => {
    const financials = makeFinancials()
    const result = computeAnnualProjection(makeProject({ projectionAssumptions: { tuitionGrowthPct: 0.1, expenseInflationPct: 0, wageGrowthPct: 0 } }), financials)
    expect(result.years[4].revenue).toBe(Math.round(financials.totalAnnualRevenue * Math.pow(1.1, 4)))
    expect(result.years[4].payroll).toBe(financials.totalAnnualPayroll) // 0% wage growth -> flat
    expect(result.years[4].opex).toBe(financials.totalAnnualOpex) // 0% inflation -> flat
  })

  it('includes debt service from actual financing tranches, constant across years', () => {
    const tranche: FinancingTranche = { id: 't1', label: 'Loan', amount: fromDollars(300000), ratePct: 0.07, amortizationYears: 25, feesPct: 0 }
    const result = computeAnnualProjection(makeProject({ financingTranches: [tranche] }), makeFinancials())
    expect(result.years[0].debtService).toBeGreaterThan(0)
    expect(result.years[0].debtService).toBe(result.years[4].debtService)
  })

  it('DSCR is null when there is no debt service, not a divide-by-zero artifact', () => {
    const result = computeAnnualProjection(makeProject({ financingTranches: [] }), makeFinancials())
    expect(result.years[0].dscr).toBeNull()
  })

  it('accumulates cash flow into ending cash across years (cumulative, not per-year)', () => {
    const result = computeAnnualProjection(makeProject(), makeFinancials())
    const manualSum = result.years[0].cashFlow + result.years[1].cashFlow
    expect(result.years[1].endingCash).toBe(manualSum)
  })

  it('flags everGoesNegative when debt service exceeds EBITDA', () => {
    const tranche: FinancingTranche = { id: 't1', label: 'Loan', amount: fromDollars(5_000_000), ratePct: 0.09, amortizationYears: 25, feesPct: 0 }
    const result = computeAnnualProjection(makeProject({ financingTranches: [tranche] }), makeFinancials({ ebitdaAnnual: fromDollars(50000) }))
    expect(result.everGoesNegative).toBe(true)
  })
})
