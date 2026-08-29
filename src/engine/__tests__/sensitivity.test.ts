import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computeProject } from '../project'
import { computeSensitivityAnalysis } from '../sensitivity'
import type { AgeGroup, Project } from '../types'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Preschool',
  minAgeMonths: 36,
  maxAgeMonths: 48,
  order: 0,
  capacity: 20,
  enrolled: 15,
  privatePay: 12,
  subsidized: 3,
  weeklyTuition: fromDollars(280),
  subsidyWeeklyRate: fromDollars(260),
  registrationFeeAnnual: fromDollars(75),
  discountPct: 0,
  plannedStaffCount: 2,
  staffMonthlyCostPerEmployee: fromDollars(2800),
  ratioMaxChildrenPerStaff: 8,
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 20,
  ageGroups: [makeGroup()],
  payrollLineItems: [{ id: 'director', title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(4500) }],
  expenseItems: [{ id: 'food', category: 'Food', label: 'Food', classification: 'PER_CHILD', monthlyAmount: 0 as never, perChildMonthlyAmount: fromDollars(80), pctOfRevenue: 0 }],
  staffCoverageBufferPct: 0,
  targetDSCR: 1.25,
  targetProfitMarginPct: 0.1,
  loanInterestRatePct: 0.075,
  loanAmortizationYears: 25,
  negotiationBufferPct: 0.1,
  ownerEquityAvailable: fromDollars(100000),
  workingCapitalMonths: 2,
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

const runNamed = (label: string, project: Project) => computeSensitivityAnalysis(project).runs.find((r) => r.label === label)!

describe('computeSensitivityAnalysis', () => {
  it('matches a direct computeProject() run for the baseline', () => {
    const project = makeProject()
    const { baseline } = computeSensitivityAnalysis(project)
    const direct = computeProject(project)
    expect(baseline.ebitdaMonthly).toBe(direct.financials.ebitdaMonthly)
    expect(baseline.maxPropertyPrice).toBe(direct.building.maxPropertyPrice)
  })

  it('Tuition -10% reduces EBITDA and Tuition +10% increases it, relative to baseline', () => {
    const project = makeProject()
    const down = runNamed('Tuition -10%', project)
    const up = runNamed('Tuition +10%', project)
    expect(down.delta.ebitdaMonthly).toBeLessThan(0)
    expect(up.delta.ebitdaMonthly).toBeGreaterThan(0)
  })

  it('Wages +10% reduces EBITDA', () => {
    const project = makeProject()
    const run = runNamed('Wages +10%', project)
    expect(run.delta.ebitdaMonthly).toBeLessThan(0)
  })

  it('Enrollment +10% increases EBITDA and Enrollment -10% decreases it', () => {
    const project = makeProject()
    const up = runNamed('Enrollment +10%', project)
    const down = runNamed('Enrollment -10%', project)
    expect(up.delta.ebitdaMonthly).toBeGreaterThan(0)
    expect(down.delta.ebitdaMonthly).toBeLessThan(0)
  })

  it('Renovation +20% is marked not applicable when no line item mentions renovation', () => {
    const project = makeProject({ projectCostLineItems: [{ id: 'ffe', category: 'FF&E', label: 'Furniture', amount: fromDollars(20000) }] })
    const run = runNamed('Renovation +20%', project)
    expect(run.applicable).toBe(false)
  })

  it('Renovation +20% increases non-property cost and reduces Max Property Price when a renovation line item exists', () => {
    const project = makeProject({ projectCostLineItems: [{ id: 'reno', category: 'Renovation', label: 'Renovation', amount: fromDollars(100000) }] })
    const run = runNamed('Renovation +20%', project)
    expect(run.applicable).toBe(true)
    expect(run.delta.maxPropertyPrice).toBeLessThanOrEqual(0)
  })

  it('Interest Rate +1% reduces the max sustainable loan; -1% increases it', () => {
    const project = makeProject()
    const up = runNamed('Interest Rate +1%', project)
    const down = runNamed('Interest Rate -1%', project)
    expect(up.delta.maxSustainableLoan).toBeLessThanOrEqual(0)
    expect(down.delta.maxSustainableLoan).toBeGreaterThanOrEqual(0)
  })

  it('floors Interest Rate -1% at 0% instead of going negative', () => {
    const project = makeProject({ loanInterestRatePct: 0.005 })
    const run = runNamed('Interest Rate -1%', project)
    expect(run.applicable).toBe(true)
    expect(run.metrics.maxSustainableLoan).toBeGreaterThanOrEqual(0)
  })
})
