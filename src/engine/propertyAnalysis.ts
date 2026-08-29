import type { BuildingAffordabilityResult } from './buildingAffordability'
import type { EquityCheckResult, SourcesUsesResult } from './financing'
import { computeEquityCheck, computeFinancingStructure, computeSourcesAndUses, type FinancingStructureResult } from './financing'
import type { FinancialSummary } from './financials'
import { addMoney, formatMoney, subMoney, type Money } from './money'
import type { Project, PropertyRecord } from './types'

export type AffordabilityVerdict = 'AFFORDABLE' | 'AFFORDABLE_WITH_CONDITIONS' | 'RENEGOTIATE' | 'HIGH_RISK' | 'NOT_AFFORDABLE'

export const VERDICT_LABELS: Record<AffordabilityVerdict, string> = {
  AFFORDABLE: 'AFFORDABLE',
  AFFORDABLE_WITH_CONDITIONS: 'AFFORDABLE WITH CONDITIONS',
  RENEGOTIATE: 'RENEGOTIATE',
  HIGH_RISK: 'HIGH RISK',
  NOT_AFFORDABLE: 'NOT AFFORDABLE',
}

export interface PropertyAffordabilityResult {
  propertyId: string
  propertyPrice: Money
  totalProjectCost: Money
  financing: FinancingStructureResult
  sourcesUses: SourcesUsesResult
  actualAnnualDebtService: Money
  actualMonthlyDebtService: Money
  actualDSCR: number | null
  cashFlowAfterDebtMonthly: Money
  equityCheck: EquityCheckResult
  verdict: AffordabilityVerdict
  reasons: string[]
}

const pickPrice = (property: PropertyRecord): Money => (property.proposedOffer > 0 ? property.proposedOffer : property.askingPrice)

/**
 * Answers "can this childcare afford this specific building?" (spec §35)
 * using the ACTUAL proposed financing structure (tranches), not the abstract
 * sustainable-capacity assumptions from the Building Calculator — those are
 * used here only as the yardstick a real deal is measured against.
 */
export const computePropertyAffordability = (
  property: PropertyRecord,
  project: Project,
  financials: FinancialSummary,
  building: BuildingAffordabilityResult,
): PropertyAffordabilityResult => {
  const propertyPrice = pickPrice(property)
  const totalProjectCost = addMoney(propertyPrice, building.projectCost.totalNonPropertyCost)

  const financing = computeFinancingStructure(project.financingTranches)
  const sourcesUses = computeSourcesAndUses(
    project.ownerEquityAvailable,
    project.financingTranches,
    propertyPrice,
    project.projectCostLineItems.map((i) => ({ label: i.label, amount: i.amount })),
    building.projectCost.workingCapitalAmount,
  )

  const actualAnnualDebtService = financing.combinedAnnualPayment
  const actualDSCR = actualAnnualDebtService > 0 ? financials.ebitdaAnnual / actualAnnualDebtService : null
  const cashFlowAfterDebtMonthly = subMoney(financials.ebitdaMonthly, financing.combinedMonthlyPayment)

  const equityCheck = computeEquityCheck(totalProjectCost, project.requiredEquityPct, project.ownerEquityAvailable)

  const reasons: string[] = []
  let verdict: AffordabilityVerdict

  if (financials.ebitdaMonthly < 0) {
    verdict = 'NOT_AFFORDABLE'
    reasons.push('This center is not currently profitable (negative EBITDA) — it cannot service any debt.')
  } else if (sourcesUses.gap > 0) {
    verdict = 'NOT_AFFORDABLE'
    reasons.push(`Funding gap of ${formatMoney(sourcesUses.gap)} — proposed Sources do not cover Uses.`)
  } else if (actualDSCR !== null && actualDSCR < 1.0) {
    verdict = 'NOT_AFFORDABLE'
    reasons.push('Actual DSCR is below 1.0 — EBITDA does not cover the proposed debt service at all.')
  } else if (equityCheck.isEquityShortfall) {
    verdict = 'HIGH_RISK'
    reasons.push(`Owner equity is below the lender's required minimum (${(project.requiredEquityPct * 100).toFixed(0)}% of project cost).`)
  } else if (actualDSCR !== null && actualDSCR < project.targetDSCR) {
    verdict = 'HIGH_RISK'
    reasons.push(`Actual DSCR (${actualDSCR.toFixed(2)}) is below your target DSCR (${project.targetDSCR.toFixed(2)}).`)
  } else if (actualAnnualDebtService > building.debtCapacity.maxAnnualDebtService) {
    verdict = 'RENEGOTIATE'
    reasons.push('Proposed debt service exceeds this center\'s sustainable capacity — the price or terms need renegotiation.')
  } else if (propertyPrice > building.recommendedSearchPrice) {
    verdict = 'AFFORDABLE_WITH_CONDITIONS'
    reasons.push('Price is within the maximum sustainable range, but above the recommended (buffered) search price.')
  } else {
    verdict = 'AFFORDABLE'
    reasons.push('Proposed structure is within sustainable debt capacity, meets target DSCR, and equity requirements are met.')
  }

  return {
    propertyId: property.id,
    propertyPrice,
    totalProjectCost,
    financing,
    sourcesUses,
    actualAnnualDebtService,
    actualMonthlyDebtService: financing.combinedMonthlyPayment,
    actualDSCR,
    cashFlowAfterDebtMonthly,
    equityCheck,
    verdict,
    reasons,
  }
}
