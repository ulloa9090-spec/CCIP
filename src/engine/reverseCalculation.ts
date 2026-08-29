import { monthlyPaymentForLoan } from './amortization'
import { computeEquityCheck } from './financing'
import { evaluateEnrollmentLevel } from './levelEconomics'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import type { ProjectCostResult } from './projectCost'
import type { Project, PropertyRecord } from './types'

export interface ReverseCalculationResult {
  hasProperty: boolean
  propertyPrice: Money | null
  totalProjectCost: Money | null
  impliedLoan: Money | null
  requiredAnnualDebtService: Money | null
  requiredNOIAnnual: Money | null
  requiredEBITDAMonthly: Money | null
  requiredEquity: Money | null
  hasCapacity: boolean
  requiredChildren: number | null
  requiredOccupancy: number | null
  requiredRevenueMonthly: Money | null
  achievableWithinCapacity: boolean
}

/**
 * Reverse of the Building Calculator waterfall (spec §36): given a specific
 * property price, work backward — implied loan → required debt service →
 * required NOI (via the DSCR method) → required enrollment, found by
 * simulating enrollment level-by-level (same engine as Break-Even) rather
 * than a closed-form inversion, because staffing cliffs make the forward
 * function non-linear.
 */
export const computeReverseCalculation = (
  property: PropertyRecord | null,
  project: Project,
  projectCost: ProjectCostResult,
): ReverseCalculationResult => {
  if (!property) {
    return {
      hasProperty: false,
      propertyPrice: null,
      totalProjectCost: null,
      impliedLoan: null,
      requiredAnnualDebtService: null,
      requiredNOIAnnual: null,
      requiredEBITDAMonthly: null,
      requiredEquity: null,
      hasCapacity: false,
      requiredChildren: null,
      requiredOccupancy: null,
      requiredRevenueMonthly: null,
      achievableWithinCapacity: false,
    }
  }

  const propertyPrice = property.proposedOffer > 0 ? property.proposedOffer : property.askingPrice
  const totalProjectCost = addMoney(propertyPrice, projectCost.totalNonPropertyCost)

  const impliedLoanRaw = subMoney(totalProjectCost, project.ownerEquityAvailable)
  const impliedLoan = impliedLoanRaw < 0 ? zeroMoney : impliedLoanRaw

  const requiredMonthlyDebtService = monthlyPaymentForLoan(impliedLoan, project.loanInterestRatePct, project.loanAmortizationYears)
  const requiredAnnualDebtService = mulMoney(requiredMonthlyDebtService, 12)
  const requiredNOIAnnual = mulMoney(requiredAnnualDebtService, project.targetDSCR)
  const requiredEBITDAMonthly = Math.round(requiredNOIAnnual / 12) as Money

  const requiredEquity = computeEquityCheck(totalProjectCost, project.requiredEquityPct, project.ownerEquityAvailable).requiredEquity

  const totalCapacity = project.ageGroups.reduce((sum, g) => sum + g.capacity, 0)
  if (totalCapacity === 0) {
    return {
      hasProperty: true,
      propertyPrice,
      totalProjectCost,
      impliedLoan,
      requiredAnnualDebtService,
      requiredNOIAnnual,
      requiredEBITDAMonthly,
      requiredEquity,
      hasCapacity: false,
      requiredChildren: null,
      requiredOccupancy: null,
      requiredRevenueMonthly: null,
      achievableWithinCapacity: false,
    }
  }

  const flatPayroll = addMoney(zeroMoney, ...project.payrollLineItems.map((p) => mulMoney(p.monthlyCostPerEmployee, p.headcount)))

  let requiredChildren: number | null = null
  let requiredRevenueMonthly: Money | null = null
  for (let children = 0; children <= totalCapacity; children++) {
    const level = evaluateEnrollmentLevel(project.ageGroups, flatPayroll, project.expenseItems, children / totalCapacity)
    if (level.ebitda >= requiredEBITDAMonthly) {
      requiredChildren = level.children
      requiredRevenueMonthly = level.revenue
      break
    }
  }

  return {
    hasProperty: true,
    propertyPrice,
    totalProjectCost,
    impliedLoan,
    requiredAnnualDebtService,
    requiredNOIAnnual,
    requiredEBITDAMonthly,
    requiredEquity,
    hasCapacity: true,
    requiredChildren,
    requiredOccupancy: requiredChildren === null ? null : requiredChildren / totalCapacity,
    requiredRevenueMonthly,
    achievableWithinCapacity: requiredChildren !== null,
  }
}
