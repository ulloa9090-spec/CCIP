import { describe, expect, it } from 'vitest'
import { computeBuildingAffordability } from '../buildingAffordability'
import { computeBreakEven } from '../breakEven'
import { computeDecision } from '../decisionEngine'
import type { FinancialSummary } from '../financials'
import { fromDollars } from '../money'
import { computePropertyAffordability } from '../propertyAnalysis'
import { computeStaffingSummary } from '../staffing'
import type { AgeGroup, Project, PropertyRecord } from '../types'

const makeFinancials = (overrides: Partial<FinancialSummary> = {}): FinancialSummary => ({
  totalMonthlyRevenue: fromDollars(60000),
  totalAnnualRevenue: fromDollars(720000),
  totalMonthlyPayroll: fromDollars(28000),
  totalAnnualPayroll: fromDollars(336000),
  totalMonthlyOpex: fromDollars(9000),
  totalAnnualOpex: fromDollars(108000),
  ebitdaMonthly: fromDollars(23000),
  ebitdaAnnual: fromDollars(276000),
  ebitdaMargin: 0.38,
  cashFlowMonthly: fromDollars(23000),
  payrollPctOfRevenue: 0.47,
  opexPctOfRevenue: 0.15,
  ...overrides,
})

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Preschool',
  minAgeMonths: 36,
  maxAgeMonths: 48,
  order: 0,
  capacity: 30,
  enrolled: 20,
  privatePay: 20,
  subsidized: 0,
  weeklyTuition: fromDollars(300),
  subsidyWeeklyRate: fromDollars(280),
  registrationFeeAnnual: 0 as never,
  discountPct: 0,
  plannedStaffCount: 3,
  staffMonthlyCostPerEmployee: fromDollars(2900),
  ratioMaxChildrenPerStaff: 8,
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 30,
  ageGroups: [makeGroup()],
  payrollLineItems: [],
  expenseItems: [],
  staffCoverageBufferPct: 0.1,
  targetDSCR: 1.25,
  targetProfitMarginPct: 0.15,
  loanInterestRatePct: 0.075,
  loanAmortizationYears: 25,
  negotiationBufferPct: 0.1,
  ownerEquityAvailable: fromDollars(150000),
  workingCapitalMonths: 3,
  projectCostLineItems: [{ id: 'reno', category: 'Renovation', label: 'Renovation', amount: fromDollars(50000) }],
  financingType: 'CUSTOM',
  financingTranches: [],
  requiredEquityPct: 0.1,
  properties: [],
  selectedPropertyId: null,
  scenarios: [],
  activeScenarioId: 'base',
  projectionAssumptions: { tuitionGrowthPct: 0.03, expenseInflationPct: 0.03, wageGrowthPct: 0.03 },
  leaseTerms: { baseRentMonthly: 0 as never, nnnMonthly: 0 as never, annualEscalationPct: 0.03, termYears: 5, securityDepositMonths: 2, tenantImprovementAllowance: 0 as never },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeProperty = (overrides: Partial<PropertyRecord> = {}): PropertyRecord => ({
  id: 'prop1',
  address: '1 Main St',
  askingPrice: fromDollars(200000),
  proposedOffer: 0 as never,
  notes: '',
  ...overrides,
})

const runDecision = (project: Project, financials: FinancialSummary, property: PropertyRecord | null = null) => {
  const building = computeBuildingAffordability(project, financials)
  const staffing = computeStaffingSummary(project.ageGroups, project.staffCoverageBufferPct)
  const breakEven = computeBreakEven(project.ageGroups, project.payrollLineItems, project.expenseItems)
  const propertyAffordability = property ? computePropertyAffordability(property, project, financials, building) : null
  return computeDecision(financials, breakEven, building, staffing, propertyAffordability, project.ageGroups)
}

describe('computeDecision', () => {
  it('rates NOT_VIABLE when the center is losing money today', () => {
    const result = runDecision(makeProject(), makeFinancials({ ebitdaMonthly: fromDollars(-500), ebitdaAnnual: fromDollars(-6000) }))
    expect(result.rating).toBe('NOT_VIABLE')
  })

  it('rates NOT_VIABLE when break-even exceeds licensed capacity', () => {
    // Enormous payroll relative to revenue makes break-even unreachable.
    const project = makeProject({ payrollLineItems: [{ id: 'x', title: 'X', headcount: 1, monthlyCostPerEmployee: fromDollars(200000) }] })
    const result = runDecision(project, makeFinancials())
    expect(result.rating).toBe('NOT_VIABLE')
  })

  it('rates HIGH_RISK when a classroom is staffed below the regulatory minimum', () => {
    const project = makeProject({ ageGroups: [makeGroup({ enrolled: 24, ratioMaxChildrenPerStaff: 8, plannedStaffCount: 1 })] }) // needs 3, has 1
    const result = runDecision(project, makeFinancials())
    expect(result.majorRisks.some((r) => r.includes('below the regulatory minimum'))).toBe(true)
    expect(result.rating).toBe('HIGH_RISK')
  })

  it('rates CONDITIONAL when a ratio is unverified but nothing else is wrong', () => {
    const project = makeProject({ ageGroups: [makeGroup({ ratioMaxChildrenPerStaff: undefined, plannedStaffCount: 3 })] })
    const result = runDecision(project, makeFinancials())
    expect(result.missingInformation.length).toBeGreaterThan(0)
    expect(result.rating).toBe('CONDITIONAL')
  })

  it('rates STRONG for a healthy, low-risk, fully-verified center', () => {
    const project = makeProject({
      ageGroups: [makeGroup({ capacity: 30, enrolled: 20, privatePay: 20, ratioMaxChildrenPerStaff: 8, plannedStaffCount: 3 })],
      projectCostLineItems: [{ id: 'reno', category: 'Renovation', label: 'Renovation', amount: fromDollars(50000) }],
    })
    const result = runDecision(project, makeFinancials({ ebitdaMargin: 0.3 }))
    expect(result.rating).toBe('STRONG')
    expect(result.majorRisks).toHaveLength(0)
  })

  it('rates NOT_VIABLE when the selected property is not affordable', () => {
    const project = makeProject({
      ownerEquityAvailable: fromDollars(1000),
      financingTranches: [{ id: 't1', label: 'Loan', amount: fromDollars(5000), ratePct: 0.07, amortizationYears: 25, feesPct: 0 }],
    })
    const result = runDecision(project, makeFinancials(), makeProperty({ askingPrice: fromDollars(500000) }))
    expect(result.rating).toBe('NOT_VIABLE')
  })

  it('always includes a binding constraint and a why explanation', () => {
    const result = runDecision(makeProject(), makeFinancials())
    expect(result.bindingConstraint.length).toBeGreaterThan(0)
    expect(result.why.length).toBeGreaterThan(0)
  })
})
