import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computeProjectCost } from '../projectCost'
import { computeReverseCalculation } from '../reverseCalculation'
import type { AgeGroup, Project, PropertyRecord } from '../types'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Preschool',
  minAgeMonths: 36,
  maxAgeMonths: 48,
  order: 0,
  capacity: 40,
  enrolled: 0,
  privatePay: 0,
  subsidized: 0,
  weeklyTuition: fromDollars(280),
  subsidyWeeklyRate: fromDollars(260),
  registrationFeeAnnual: 0 as never,
  discountPct: 0,
  plannedStaffCount: 1,
  staffMonthlyCostPerEmployee: fromDollars(2900),
  ...overrides,
})

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 40,
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
  projectionAssumptions: { tuitionGrowthPct: 0.03, expenseInflationPct: 0.03, wageGrowthPct: 0.03 },
  leaseTerms: { baseRentMonthly: 0 as never, nnnMonthly: 0 as never, annualEscalationPct: 0.03, termYears: 5, securityDepositMonths: 2, tenantImprovementAllowance: 0 as never },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeProperty = (overrides: Partial<PropertyRecord> = {}): PropertyRecord => ({
  id: 'prop1',
  address: '456 Oak Ave',
  askingPrice: fromDollars(500000),
  proposedOffer: 0 as never,
  notes: '',
  ...overrides,
})

describe('computeReverseCalculation', () => {
  it('returns hasProperty: false with no property selected', () => {
    const project = makeProject()
    const projectCost = computeProjectCost(project.projectCostLineItems, project.workingCapitalMonths, fromDollars(4000), fromDollars(0))
    const result = computeReverseCalculation(null, project, projectCost)
    expect(result.hasProperty).toBe(false)
    expect(result.requiredChildren).toBeNull()
  })

  it('prefers the proposed offer over the asking price when both are set', () => {
    const project = makeProject()
    const property = makeProperty({ askingPrice: fromDollars(500000), proposedOffer: fromDollars(450000) })
    const projectCost = computeProjectCost([], 0, fromDollars(4000), fromDollars(0))
    const result = computeReverseCalculation(property, project, projectCost)
    expect(result.propertyPrice).toBe(fromDollars(450000))
  })

  it('computes the implied loan as total project cost minus owner equity, floored at zero', () => {
    const project = makeProject({ ownerEquityAvailable: fromDollars(600000) }) // more than the property costs
    const property = makeProperty({ askingPrice: fromDollars(500000) })
    const projectCost = computeProjectCost([], 0, fromDollars(4000), fromDollars(0))
    const result = computeReverseCalculation(property, project, projectCost)
    expect(result.impliedLoan).toBe(0)
  })

  it('finds a required enrollment where EBITDA meets the required NOI (validated against the level-economics engine)', () => {
    const project = makeProject({ ownerEquityAvailable: fromDollars(100000) })
    const property = makeProperty({ askingPrice: fromDollars(400000) })
    const projectCost = computeProjectCost([], 0, fromDollars(4000), fromDollars(0))
    const result = computeReverseCalculation(property, project, projectCost)

    expect(result.achievableWithinCapacity).toBe(true)
    expect(result.requiredChildren).toBeGreaterThan(0)
    expect(result.requiredChildren!).toBeLessThanOrEqual(project.licensedCapacity)
  })

  it('reports not achievable within capacity when the property is far too expensive for this center', () => {
    const project = makeProject({ ownerEquityAvailable: fromDollars(10000) })
    const property = makeProperty({ askingPrice: fromDollars(50_000_000) })
    const projectCost = computeProjectCost([], 0, fromDollars(4000), fromDollars(0))
    const result = computeReverseCalculation(property, project, projectCost)
    expect(result.achievableWithinCapacity).toBe(false)
    expect(result.requiredChildren).toBeNull()
  })

  it('handles zero licensed capacity without throwing', () => {
    const project = makeProject({ ageGroups: [], licensedCapacity: 0 })
    const property = makeProperty()
    const projectCost = computeProjectCost([], 0, fromDollars(4000), fromDollars(0))
    const result = computeReverseCalculation(property, project, projectCost)
    expect(result.hasCapacity).toBe(false)
  })
})
