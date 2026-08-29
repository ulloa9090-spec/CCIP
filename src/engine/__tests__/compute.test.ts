import { describe, expect, it } from 'vitest'
import { computeProject } from '../index'
import { fromDollars } from '../money'
import type { AgeGroup, ExpenseItem, PayrollLineItem, Project } from '../types'

const baseGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'infants',
  name: 'Infants',
  minAgeMonths: 6,
  maxAgeMonths: 18,
  order: 0,
  capacity: 12,
  enrolled: 10,
  privatePay: 7,
  subsidized: 3,
  weeklyTuition: fromDollars(325),
  subsidyWeeklyRate: fromDollars(300),
  registrationFeeAnnual: fromDollars(100),
  discountPct: 0,
  plannedStaffCount: 2,
  staffMonthlyCostPerEmployee: fromDollars(2800),
  ...overrides,
})

const baseProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 12,
  ageGroups: [baseGroup()],
  payrollLineItems: [{ id: 'director', title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(4500) }],
  expenseItems: [{ id: 'food', category: 'Food', label: 'Food', classification: 'FIXED', monthlyAmount: fromDollars(800), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 }],
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
  projectionAssumptions: { tuitionGrowthPct: 0.03, expenseInflationPct: 0.03, wageGrowthPct: 0.03 },
  leaseTerms: { baseRentMonthly: 0 as never, nnnMonthly: 0 as never, annualEscalationPct: 0.03, termYears: 5, securityDepositMonths: 2, tenantImprovementAllowance: 0 as never },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('computeProject (full dependency chain)', () => {
  it('flows enrollment through revenue, payroll, and opex into EBITDA', () => {
    const result = computeProject(baseProject())
    expect(result.validationIssues).toHaveLength(0)
    expect(result.revenue.totalMonthlyRevenue).toBeGreaterThan(0)
    expect(result.financials.totalMonthlyPayroll).toBe(
      result.payroll.totalMonthlyPayroll + result.staffing.totalClassroomMonthlyPayroll,
    )
    expect(result.financials.ebitdaMonthly).toBe(
      result.revenue.totalMonthlyRevenue - result.financials.totalMonthlyPayroll - result.expenses.totalMonthlyOpex,
    )
  })

  it('recalculates every downstream metric when an upstream enrollment input changes (spec §67)', () => {
    const before = computeProject(baseProject())
    const after = computeProject(baseProject({ ageGroups: [baseGroup({ enrolled: 11, privatePay: 8 })] }))
    expect(after.revenue.totalMonthlyRevenue).toBeGreaterThan(before.revenue.totalMonthlyRevenue)
    expect(after.financials.ebitdaMonthly).toBeGreaterThan(before.financials.ebitdaMonthly)
  })

  it('flags enrollment exceeding capacity as a validation error and does not silently clamp', () => {
    const result = computeProject(baseProject({ ageGroups: [baseGroup({ enrolled: 15, capacity: 12 })] }))
    expect(result.validationIssues.some((i) => i.severity === 'ERROR')).toBe(true)
  })

  it('flags private + subsidized exceeding enrolled', () => {
    const result = computeProject(baseProject({ ageGroups: [baseGroup({ enrolled: 5, privatePay: 4, subsidized: 4 })] }))
    expect(result.validationIssues.some((i) => i.message.includes('exceeds enrolled'))).toBe(true)
  })

  it('produces a negative EBITDA (loss) scenario correctly, without clamping to zero', () => {
    const project = baseProject({
      payrollLineItems: [{ id: 'staff', title: 'Staff', headcount: 5, monthlyCostPerEmployee: fromDollars(3500) }],
    })
    const result = computeProject(project)
    expect(result.financials.ebitdaMonthly).toBeLessThan(0)
    expect(result.alerts.some((a) => a.level === 'critical')).toBe(true)
  })

  it('handles a project with zero age groups (capacity 0) without throwing', () => {
    const result = computeProject(baseProject({ licensedCapacity: 0, ageGroups: [] }))
    expect(result.revenue.totalMonthlyRevenue).toBe(0)
    expect(result.financials.ebitdaMonthly).toBe(-result.payroll.totalMonthlyPayroll - result.expenses.totalMonthlyOpex)
  })

  it('is not hardcoded to a licensed capacity of 60 — works identically in shape for other capacities', () => {
    for (const capacity of [30, 50, 75, 100]) {
      const project = baseProject({
        licensedCapacity: capacity,
        ageGroups: [baseGroup({ capacity, enrolled: capacity, privatePay: capacity, subsidized: 0 })],
      })
      const result = computeProject(project)
      expect(result.revenue.totalCapacity).toBe(capacity)
      expect(result.revenue.occupancy).toBe(1)
    }
  })

  const expenseFixture: ExpenseItem = {
    id: 'food',
    category: 'Food',
    label: 'Food',
    classification: 'FIXED',
    monthlyAmount: fromDollars(800),
    perChildMonthlyAmount: 0 as never,
    pctOfRevenue: 0,
  }
  const payrollFixture: PayrollLineItem = { id: 'director', title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(4500) }

  it('exposes each expense/payroll line so the UI can list them individually', () => {
    const result = computeProject(baseProject({ expenseItems: [expenseFixture], payrollLineItems: [payrollFixture] }))
    expect(result.expenses.byItem).toHaveLength(1)
    expect(result.payroll.byPosition).toHaveLength(1)
  })
})
