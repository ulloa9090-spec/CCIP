import { describe, expect, it } from 'vitest'
import { computeBuildingAffordability } from '../buildingAffordability'
import type { FinancialSummary } from '../financials'
import { fromDollars } from '../money'
import { computePropertyAffordability } from '../propertyAnalysis'
import type { FinancingTranche, Project, ProjectCostLineItem, PropertyRecord } from '../types'

const makeFinancials = (overrides: Partial<FinancialSummary> = {}): FinancialSummary => ({
  totalMonthlyRevenue: fromDollars(60000),
  totalAnnualRevenue: fromDollars(720000),
  totalMonthlyPayroll: fromDollars(30000),
  totalAnnualPayroll: fromDollars(360000),
  totalMonthlyOpex: fromDollars(9000),
  totalAnnualOpex: fromDollars(108000),
  ebitdaMonthly: fromDollars(21000),
  ebitdaAnnual: fromDollars(252000),
  ebitdaMargin: 0.35,
  cashFlowMonthly: fromDollars(21000),
  payrollPctOfRevenue: 0.5,
  opexPctOfRevenue: 0.15,
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeProperty = (overrides: Partial<PropertyRecord> = {}): PropertyRecord => ({
  id: 'prop1',
  address: '123 Main St',
  askingPrice: fromDollars(500000),
  proposedOffer: 0 as never,
  notes: '',
  ...overrides,
})

const modestTranche = (overrides: Partial<FinancingTranche> = {}): FinancingTranche => ({
  id: 't1',
  label: 'Bank Loan',
  amount: fromDollars(350000),
  ratePct: 0.075,
  amortizationYears: 25,
  feesPct: 0.02,
  ...overrides,
})

describe('computePropertyAffordability', () => {
  it('returns NOT_AFFORDABLE when the center is not currently profitable', () => {
    const project = makeProject()
    const financials = makeFinancials({ ebitdaMonthly: fromDollars(-1000), ebitdaAnnual: fromDollars(-12000) })
    const building = computeBuildingAffordability(project, financials)
    const result = computePropertyAffordability(makeProperty(), project, financials, building)
    expect(result.verdict).toBe('NOT_AFFORDABLE')
  })

  it('returns NOT_AFFORDABLE when proposed Sources do not cover Uses', () => {
    const financials = makeFinancials()
    const project = makeProject({
      ownerEquityAvailable: fromDollars(1000), // far too little
      financingTranches: [modestTranche({ amount: fromDollars(10000) })], // far too little financing
    })
    const building = computeBuildingAffordability(project, financials)
    const result = computePropertyAffordability(makeProperty({ askingPrice: fromDollars(500000) }), project, financials, building)
    expect(result.sourcesUses.gap).toBeGreaterThan(0)
    expect(result.verdict).toBe('NOT_AFFORDABLE')
  })

  it('returns NOT_AFFORDABLE when actual DSCR is below 1.0', () => {
    const financials = makeFinancials({ ebitdaAnnual: fromDollars(20000), ebitdaMonthly: fromDollars(1666) })
    const project = makeProject({
      ownerEquityAvailable: fromDollars(150000),
      financingTranches: [modestTranche({ amount: fromDollars(500000), ratePct: 0.09, amortizationYears: 25 })],
    })
    const building = computeBuildingAffordability(project, financials)
    const result = computePropertyAffordability(makeProperty({ askingPrice: fromDollars(650000) }), project, financials, building)
    expect(result.actualDSCR).not.toBeNull()
    expect(result.actualDSCR!).toBeLessThan(1)
    expect(result.verdict).toBe('NOT_AFFORDABLE')
  })

  it('returns HIGH_RISK when owner equity is below the required minimum (Sources still cover Uses, DSCR still clears)', () => {
    const financials = makeFinancials()
    const projectCostItems: ProjectCostLineItem[] = []
    const project = makeProject({
      ownerEquityAvailable: fromDollars(5000), // small relative to a $500k+ deal
      requiredEquityPct: 0.2,
      // Financed enough that Sources still cover Uses despite thin equity, isolating the equity check.
      financingTranches: [modestTranche({ amount: fromDollars(617000) })],
      projectCostLineItems: projectCostItems,
    })
    const building = computeBuildingAffordability(project, financials)
    const result = computePropertyAffordability(makeProperty({ askingPrice: fromDollars(500000) }), project, financials, building)
    expect(result.sourcesUses.gap).toBeLessThanOrEqual(0)
    expect(result.actualDSCR).not.toBeNull()
    expect(result.actualDSCR!).toBeGreaterThanOrEqual(1)
    expect(result.equityCheck.isEquityShortfall).toBe(true)
    expect(result.verdict).toBe('HIGH_RISK')
  })

  it('returns AFFORDABLE when the deal is fully within sustainable capacity, DSCR, and equity requirements', () => {
    // Healthy, low-leverage scenario: modest price, ample equity, conservative debt.
    const financials = makeFinancials({ ebitdaAnnual: fromDollars(300000), ebitdaMonthly: fromDollars(25000) })
    const project = makeProject({
      ownerEquityAvailable: fromDollars(200000),
      requiredEquityPct: 0.1,
      financingTranches: [modestTranche({ amount: fromDollars(150000), ratePct: 0.06, amortizationYears: 25 })],
    })
    const building = computeBuildingAffordability(project, financials)
    const result = computePropertyAffordability(makeProperty({ askingPrice: fromDollars(150000) }), project, financials, building)
    expect(result.verdict).toBe('AFFORDABLE')
  })

  it('returns RENEGOTIATE when proposed debt service exceeds sustainable capacity but DSCR/equity still clear', () => {
    // High DSCR headroom on paper (huge equity keeps % checks happy) but the loan itself is oversized vs. NOI capacity.
    const financials = makeFinancials({ ebitdaAnnual: fromDollars(60000), ebitdaMonthly: fromDollars(5000) })
    const project = makeProject({
      targetDSCR: 1.05,
      ownerEquityAvailable: fromDollars(900000),
      requiredEquityPct: 0.05,
      financingTranches: [modestTranche({ amount: fromDollars(500000), ratePct: 0.06, amortizationYears: 25 })],
    })
    const building = computeBuildingAffordability(project, financials)
    const result = computePropertyAffordability(makeProperty({ askingPrice: fromDollars(500000) }), project, financials, building)
    // Target-margin method drives sustainable capacity to $0 here (thin EBITDA vs. a 15% margin target on high
    // revenue), so any real proposed debt service exceeds it even though DSCR and equity checks pass individually.
    expect(result.actualDSCR).not.toBeNull()
    expect(result.actualDSCR!).toBeGreaterThanOrEqual(project.targetDSCR)
    expect(result.equityCheck.isEquityShortfall).toBe(false)
    expect(building.debtCapacity.maxAnnualDebtService).toBe(0)
    expect(result.verdict).toBe('RENEGOTIATE')
  })
})
