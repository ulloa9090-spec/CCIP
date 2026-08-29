import { maxLoanForPayment } from './amortization'
import { computeDebtCapacity, type DebtCapacityResult } from './debtCapacity'
import type { FinancialSummary } from './financials'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import { computeProjectCost, type ProjectCostResult } from './projectCost'
import type { Project } from './types'

export type ConfidenceLevel = 'LOW' | 'MEDIUM'

export interface BuildingAffordabilityResult {
  debtCapacity: DebtCapacityResult
  maxSustainableLoan: Money
  maxTotalProjectCost: Money
  projectCost: ProjectCostResult
  /** Floored at 0 — a negative raw result means non-property costs alone exceed sustainable project cost. */
  maxPropertyPrice: Money
  rawMaxPropertyPriceIsNegative: boolean
  recommendedSearchPrice: Money
  confidence: ConfidenceLevel
}

/**
 * The Building Calculator waterfall (spec §34): NOI → max debt service →
 * max loan → max total project cost → less non-property costs → max
 * property price → less negotiation buffer → recommended search price.
 * Uses CURRENT financials, not a projected/stabilized figure — no future
 * occupancy assumption is invented (pro-forma projections arrive with
 * Scenarios, Phase 5).
 */
export const computeBuildingAffordability = (project: Project, financials: FinancialSummary): BuildingAffordabilityResult => {
  const debtCapacity = computeDebtCapacity(financials, project.targetDSCR, project.targetProfitMarginPct)

  const maxSustainableLoan = maxLoanForPayment(
    debtCapacity.maxMonthlyDebtService,
    project.loanInterestRatePct,
    project.loanAmortizationYears,
  )

  const maxTotalProjectCost = addMoney(maxSustainableLoan, project.ownerEquityAvailable)

  const projectCost = computeProjectCost(
    project.projectCostLineItems,
    project.workingCapitalMonths,
    financials.totalMonthlyPayroll,
    financials.totalMonthlyOpex,
  )

  const rawMaxPropertyPrice = subMoney(maxTotalProjectCost, projectCost.totalNonPropertyCost)
  const maxPropertyPrice = rawMaxPropertyPrice < 0 ? zeroMoney : rawMaxPropertyPrice

  const recommendedSearchPrice = mulMoney(maxPropertyPrice, 1 - project.negotiationBufferPct)

  return {
    debtCapacity,
    maxSustainableLoan,
    maxTotalProjectCost,
    projectCost,
    maxPropertyPrice,
    rawMaxPropertyPriceIsNegative: rawMaxPropertyPrice < 0,
    recommendedSearchPrice,
    confidence: projectCost.hasLineItemData ? 'MEDIUM' : 'LOW',
  }
}
