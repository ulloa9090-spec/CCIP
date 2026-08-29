import { describe, expect, it } from 'vitest'
import { computeBuildingAffordability } from '../buildingAffordability'
import type { FinancialSummary } from '../financials'
import { fromDollars } from '../money'
import type { Project, ProjectCostLineItem } from '../types'

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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('computeBuildingAffordability', () => {
  it('runs the full waterfall: NOI -> max debt service -> max loan -> max project cost -> max property price', () => {
    const result = computeBuildingAffordability(makeProject(), makeFinancials())
    expect(result.debtCapacity.maxMonthlyDebtService).toBeGreaterThan(0)
    expect(result.maxSustainableLoan).toBeGreaterThan(0)
    expect(result.maxTotalProjectCost).toBe(result.maxSustainableLoan + fromDollars(150000))
    expect(result.maxPropertyPrice).toBeLessThanOrEqual(result.maxTotalProjectCost)
  })

  it('subtracts non-property costs (line items + working capital) from total project cost', () => {
    const lineItems: ProjectCostLineItem[] = [{ id: 'reno', category: 'Renovation', label: 'Renovation', amount: fromDollars(150000) }]
    const withCosts = computeBuildingAffordability(makeProject({ projectCostLineItems: lineItems }), makeFinancials())
    const withoutCosts = computeBuildingAffordability(makeProject({ projectCostLineItems: [] }), makeFinancials())
    expect(withCosts.maxPropertyPrice).toBeLessThan(withoutCosts.maxPropertyPrice)
  })

  it('floors max property price at zero when non-property costs exceed sustainable project cost', () => {
    const hugeCost: ProjectCostLineItem[] = [{ id: 'reno', category: 'Renovation', label: 'Renovation', amount: fromDollars(50_000_000) }]
    const result = computeBuildingAffordability(makeProject({ projectCostLineItems: hugeCost }), makeFinancials())
    expect(result.maxPropertyPrice).toBe(0)
    expect(result.rawMaxPropertyPriceIsNegative).toBe(true)
  })

  it('applies the negotiation buffer to get the recommended search price', () => {
    const result = computeBuildingAffordability(makeProject({ negotiationBufferPct: 0.1 }), makeFinancials())
    expect(result.recommendedSearchPrice).toBe(Math.round(result.maxPropertyPrice * 0.9))
  })

  it('reports LOW confidence with no project cost data, MEDIUM once real costs are entered (spec §65)', () => {
    const withoutData = computeBuildingAffordability(makeProject({ projectCostLineItems: [] }), makeFinancials())
    expect(withoutData.confidence).toBe('LOW')

    const withData = computeBuildingAffordability(
      makeProject({ projectCostLineItems: [{ id: 'a', category: 'Renovation', label: 'Renovation', amount: fromDollars(1000) }] }),
      makeFinancials(),
    )
    expect(withData.confidence).toBe('MEDIUM')
  })

  it('a center with negative EBITDA supports zero debt, not negative debt', () => {
    const result = computeBuildingAffordability(makeProject(), makeFinancials({ ebitdaAnnual: fromDollars(-50000) }))
    expect(result.debtCapacity.maxAnnualDebtService).toBe(0)
    expect(result.maxSustainableLoan).toBe(0)
  })
})
