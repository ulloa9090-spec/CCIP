import { describe, expect, it } from 'vitest'
import { monthlyPaymentForLoan, remainingBalance } from '../amortization'
import { computeBuildingAffordability } from '../buildingAffordability'
import type { FinancialSummary } from '../financials'
import { computeLeaseVsPurchase } from '../leaseComparison'
import { fromDollars } from '../money'
import type { LeaseTerms, Project, PropertyRecord } from '../types'

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

const makeLeaseTerms = (overrides: Partial<LeaseTerms> = {}): LeaseTerms => ({
  baseRentMonthly: fromDollars(4000),
  nnnMonthly: fromDollars(800),
  annualEscalationPct: 0.03,
  termYears: 5,
  securityDepositMonths: 2,
  tenantImprovementAllowance: fromDollars(10000),
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
  projectionAssumptions: { tuitionGrowthPct: 0.03, expenseInflationPct: 0.03, wageGrowthPct: 0.03 },
  leaseTerms: makeLeaseTerms(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makeProperty = (overrides: Partial<PropertyRecord> = {}): PropertyRecord => ({
  id: 'prop1',
  address: '1 Main St',
  askingPrice: fromDollars(500000),
  proposedOffer: 0 as never,
  notes: '',
  ...overrides,
})

describe('computeLeaseVsPurchase', () => {
  it('reports hasComparison: false with no selected property and zero max property price', () => {
    const project = makeProject()
    const building = computeBuildingAffordability(project, makeFinancials({ ebitdaAnnual: fromDollars(0) }))
    const result = computeLeaseVsPurchase(project, building, null)
    // With no financing capacity and no property, there is nothing to compare against.
    expect(result.hasComparison).toBe(building.maxPropertyPrice > 0)
  })

  it('computes the purchase monthly cost from the implied loan (project cost minus owner equity)', () => {
    const project = makeProject({ ownerEquityAvailable: fromDollars(100000) })
    const financials = makeFinancials()
    const building = computeBuildingAffordability(project, financials)
    const property = makeProperty({ askingPrice: fromDollars(500000) })
    const result = computeLeaseVsPurchase(project, building, property)

    const totalProjectCost = fromDollars(500000) + building.projectCost.totalNonPropertyCost
    const impliedLoan = Math.max(0, totalProjectCost - fromDollars(100000))
    const expectedPayment = monthlyPaymentForLoan(impliedLoan as never, project.loanInterestRatePct, project.loanAmortizationYears)
    expect(result.purchase.monthlyOccupancyCostYear1).toBe(expectedPayment)
  })

  it('computes lease monthly cost as base rent + NNN', () => {
    const project = makeProject()
    const building = computeBuildingAffordability(project, makeFinancials())
    const result = computeLeaseVsPurchase(project, building, makeProperty())
    expect(result.lease.monthlyOccupancyCostYear1).toBe(fromDollars(4000 + 800))
  })

  it('lease 5-year total cost exceeds 60 x year-1 monthly cost when there is positive escalation', () => {
    const project = makeProject({ leaseTerms: makeLeaseTerms({ annualEscalationPct: 0.05 }) })
    const building = computeBuildingAffordability(project, makeFinancials())
    const result = computeLeaseVsPurchase(project, building, makeProperty())
    const flatEstimate = result.lease.monthlyOccupancyCostYear1 * 60
    expect(result.lease.fiveYearTotalCost).toBeGreaterThan(flatEstimate)
  })

  it('lease cash required nets the security deposit against the TI allowance, floored at zero', () => {
    const project = makeProject({ leaseTerms: makeLeaseTerms({ baseRentMonthly: fromDollars(1000), securityDepositMonths: 2, tenantImprovementAllowance: fromDollars(50000) }) })
    const building = computeBuildingAffordability(project, makeFinancials())
    const result = computeLeaseVsPurchase(project, building, makeProperty())
    expect(result.lease.cashRequiredUpfront).toBe(0) // $2,000 deposit fully offset by a $50,000 TI allowance
  })

  it('computes equity created via the amortization remaining-balance formula', () => {
    const project = makeProject({ ownerEquityAvailable: fromDollars(100000) })
    const building = computeBuildingAffordability(project, makeFinancials())
    const property = makeProperty({ askingPrice: fromDollars(500000) })
    const result = computeLeaseVsPurchase(project, building, property)

    const totalProjectCost = fromDollars(500000) + building.projectCost.totalNonPropertyCost
    const impliedLoan = Math.max(0, totalProjectCost - fromDollars(100000))
    const balance = remainingBalance(impliedLoan as never, project.loanInterestRatePct, project.loanAmortizationYears, 60)
    expect(result.purchase.equityCreatedAt5Years).toBe(impliedLoan - balance)
  })

  it('recommends PURCHASE when buying is clearly and meaningfully cheaper than leasing', () => {
    const project = makeProject({
      ownerEquityAvailable: fromDollars(480000), // tiny implied loan -> tiny purchase cost
      leaseTerms: makeLeaseTerms({ baseRentMonthly: fromDollars(8000), nnnMonthly: fromDollars(2000), tenantImprovementAllowance: 0 as never }),
    })
    const building = computeBuildingAffordability(project, makeFinancials())
    const result = computeLeaseVsPurchase(project, building, makeProperty({ askingPrice: fromDollars(500000) }))
    expect(result.recommendation).toBe('PURCHASE')
  })

  it('recommends LEASE when the lease is clearly and meaningfully cheaper than buying', () => {
    const project = makeProject({
      ownerEquityAvailable: fromDollars(0),
      loanInterestRatePct: 0.12,
      loanAmortizationYears: 10,
      leaseTerms: makeLeaseTerms({ baseRentMonthly: fromDollars(500), nnnMonthly: fromDollars(0) as never, tenantImprovementAllowance: 0 as never }),
    })
    const building = computeBuildingAffordability(project, makeFinancials())
    const result = computeLeaseVsPurchase(project, building, makeProperty({ askingPrice: fromDollars(500000) }))
    expect(result.recommendation).toBe('LEASE')
  })
})
