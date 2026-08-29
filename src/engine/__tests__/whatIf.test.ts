import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computeProject } from '../project'
import type { AgeGroup, Project } from '../types'
import { applyWhatIf, computeWhatIfPreview, defaultWhatIfInputs } from '../whatIf'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Toddlers',
  minAgeMonths: 18,
  maxAgeMonths: 36,
  order: 0,
  capacity: 20,
  enrolled: 10,
  privatePay: 10,
  subsidized: 0,
  weeklyTuition: fromDollars(300),
  subsidyWeeklyRate: fromDollars(280),
  registrationFeeAnnual: 0 as never,
  discountPct: 0,
  plannedStaffCount: 2,
  staffMonthlyCostPerEmployee: fromDollars(2800),
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 20,
  ageGroups: [makeGroup()],
  payrollLineItems: [{ id: 'director', title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(4000) }],
  expenseItems: [],
  staffCoverageBufferPct: 0,
  targetDSCR: 1.25,
  targetProfitMarginPct: 0.1,
  loanInterestRatePct: 0.075,
  loanAmortizationYears: 25,
  negotiationBufferPct: 0.1,
  ownerEquityAvailable: fromDollars(100000),
  workingCapitalMonths: 0,
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

describe('applyWhatIf', () => {
  it('is a no-op with the default (all-zero) inputs', () => {
    const project = makeProject()
    const result = applyWhatIf(project, defaultWhatIfInputs)
    expect(computeProject(result).financials.ebitdaMonthly).toBe(computeProject(project).financials.ebitdaMonthly)
  })

  it('does not flatten each group to the aggregate occupancy when deltaChildren is 0 — a real regression: two groups at different individual occupancy rates must stay untouched, not both get scaled to the blended average', () => {
    const project = makeProject({
      ageGroups: [
        makeGroup({ id: 'full', capacity: 10, enrolled: 10, privatePay: 10 }), // 100% occupied
        makeGroup({ id: 'half', capacity: 10, enrolled: 5, privatePay: 5 }), // 50% occupied
      ],
    })
    const result = applyWhatIf(project, defaultWhatIfInputs)
    expect(result.ageGroups.find((g) => g.id === 'full')!.enrolled).toBe(10)
    expect(result.ageGroups.find((g) => g.id === 'half')!.enrolled).toBe(5)
    expect(computeProject(result).financials.ebitdaMonthly).toBe(computeProject(project).financials.ebitdaMonthly)
  })

  it('"enroll 5 more children" increases enrolled count (spec §56 example)', () => {
    const project = makeProject()
    const result = applyWhatIf(project, { ...defaultWhatIfInputs, deltaChildren: 5 })
    expect(result.ageGroups[0].enrolled).toBe(15)
  })

  it('does not enroll children past capacity', () => {
    const project = makeProject()
    const result = applyWhatIf(project, { ...defaultWhatIfInputs, deltaChildren: 50 })
    expect(result.ageGroups[0].enrolled).toBeLessThanOrEqual(result.ageGroups[0].capacity)
  })

  it('"tuition increases $25/week" raises every group\'s weekly tuition by that flat amount', () => {
    const project = makeProject()
    const result = applyWhatIf(project, { ...defaultWhatIfInputs, deltaWeeklyTuition: fromDollars(25) })
    expect(result.ageGroups[0].weeklyTuition).toBe(fromDollars(325))
  })

  it('a positive wage delta increases both classroom and support staff costs', () => {
    const project = makeProject()
    const result = applyWhatIf(project, { ...defaultWhatIfInputs, wagesDeltaPct: 0.1 })
    expect(result.ageGroups[0].staffMonthlyCostPerEmployee).toBe(fromDollars(2800 * 1.1))
    expect(result.payrollLineItems[0].monthlyCostPerEmployee).toBe(fromDollars(4000 * 1.1))
  })

  it('an interest rate delta shifts the loan assumption, floored at 0%', () => {
    const project = makeProject({ loanInterestRatePct: 0.005 })
    const result = applyWhatIf(project, { ...defaultWhatIfInputs, interestRateDeltaPct: -0.02 })
    expect(result.loanInterestRatePct).toBe(0)
  })
})

describe('computeWhatIfPreview', () => {
  it('runs the full engine on the modified project and reflects the combined effect', () => {
    const project = makeProject()
    const preview = computeWhatIfPreview(project, { ...defaultWhatIfInputs, deltaChildren: 5, deltaWeeklyTuition: fromDollars(25) })
    const baseline = computeProject(project)
    expect(preview.financials.totalMonthlyRevenue).toBeGreaterThan(baseline.financials.totalMonthlyRevenue)
  })
})
