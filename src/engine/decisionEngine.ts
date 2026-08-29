import type { BreakEvenResult } from './breakEven'
import type { BuildingAffordabilityResult } from './buildingAffordability'
import type { FinancialSummary } from './financials'
import { formatMoney, formatPercent } from './money'
import type { PropertyAffordabilityResult } from './propertyAnalysis'
import type { StaffingSummary } from './staffing'
import type { AgeGroup } from './types'

export type DecisionRating = 'STRONG' | 'VIABLE' | 'CONDITIONAL' | 'HIGH_RISK' | 'NOT_VIABLE'

export const DECISION_LABELS: Record<DecisionRating, string> = {
  STRONG: 'STRONG',
  VIABLE: 'VIABLE',
  CONDITIONAL: 'CONDITIONAL',
  HIGH_RISK: 'HIGH RISK',
  NOT_VIABLE: 'NOT VIABLE',
}

export interface DecisionResult {
  rating: DecisionRating
  bindingConstraint: string
  why: string[]
  majorRisks: string[]
  missingInformation: string[]
  actionsThatImprove: string[]
}

/**
 * Deterministic feasibility classification (spec §66) — a rule chain over
 * already-computed engine outputs, never a model guess. Collects risks and
 * missing information independently of the headline rating, so a STRONG
 * rating can still surface "ratio unverified" as something worth fixing.
 */
export const computeDecision = (
  financials: FinancialSummary,
  breakEven: BreakEvenResult,
  building: BuildingAffordabilityResult,
  staffing: StaffingSummary,
  propertyAffordability: PropertyAffordabilityResult | null,
  ageGroups: AgeGroup[],
): DecisionResult => {
  const majorRisks: string[] = []
  const missingInformation: string[] = []
  const actionsThatImprove: string[] = []

  if (staffing.groupsWithUnknownRatio.length > 0) {
    const names = staffing.groupsWithUnknownRatio.map((id) => ageGroups.find((g) => g.id === id)?.name).filter(Boolean)
    missingInformation.push(`Verified child:staff ratio for: ${names.join(', ')}.`)
    actionsThatImprove.push('Verify and enter your jurisdiction\'s child:staff ratios on the Staffing screen.')
  }
  if (staffing.groupsUnderMinimum.length > 0) {
    majorRisks.push('One or more classrooms are staffed below the regulatory minimum for their enrollment.')
    actionsThatImprove.push('Increase planned staff to at least the regulatory minimum before enrolling further.')
  }
  if (building.confidence === 'LOW') {
    missingInformation.push('Renovation, closing, and other non-property project costs on the Building Calculator.')
    actionsThatImprove.push('Enter real project cost estimates to firm up Maximum Property Price.')
  }
  if (financials.payrollPctOfRevenue > 0.65 && financials.totalMonthlyRevenue > 0) {
    majorRisks.push(`Payroll is ${formatPercent(financials.payrollPctOfRevenue)} of revenue — thin room for error.`)
  }
  if (breakEven.hasCapacity && breakEven.breakEvenOccupancy !== null && breakEven.breakEvenOccupancy >= 0.85) {
    majorRisks.push(`Break-even requires ${formatPercent(breakEven.breakEvenOccupancy)} occupancy.`)
    actionsThatImprove.push('Raise tuition, reduce fixed costs, or grow enrollment to lower the break-even bar.')
  }
  if (propertyAffordability) {
    if (propertyAffordability.sourcesUses.gap > 0) {
      majorRisks.push(`Funding gap of ${formatMoney(propertyAffordability.sourcesUses.gap)} on the selected property.`)
      actionsThatImprove.push('Increase equity or financing, or negotiate a lower price, to close the funding gap.')
    }
    if (propertyAffordability.equityCheck.isEquityShortfall) {
      majorRisks.push(`Owner equity is ${formatMoney(propertyAffordability.equityCheck.equityGap)} below the lender's required minimum.`)
      actionsThatImprove.push('Raise additional equity or find a financing structure with a lower equity requirement.')
    }
  }

  const why: string[] = []
  let rating: DecisionRating
  let bindingConstraint: string

  if (financials.ebitdaMonthly < 0) {
    rating = 'NOT_VIABLE'
    bindingConstraint = 'Current profitability'
    why.push(`Operating at a loss today (EBITDA ${formatMoney(financials.ebitdaMonthly)}/month) — nothing downstream is viable until this center is profitable.`)
  } else if (breakEven.hasCapacity && breakEven.breakEvenExceedsCapacity) {
    rating = 'NOT_VIABLE'
    bindingConstraint = 'Break-even exceeds capacity'
    why.push('Break-even enrollment exceeds licensed capacity at the current cost structure — this center cannot break even as configured.')
  } else if (propertyAffordability && propertyAffordability.verdict === 'NOT_AFFORDABLE') {
    rating = 'NOT_VIABLE'
    bindingConstraint = 'Selected property is not affordable'
    why.push(propertyAffordability.reasons[0])
  } else if (majorRisks.some((r) => r.startsWith('One or more classrooms')) || (propertyAffordability && propertyAffordability.verdict === 'HIGH_RISK')) {
    rating = 'HIGH_RISK'
    bindingConstraint = propertyAffordability?.verdict === 'HIGH_RISK' ? 'Selected property: HIGH RISK' : 'Staffing compliance'
    why.push('A compliance or high-risk condition exists that should be resolved before proceeding.')
  } else if (missingInformation.length > 0 || (propertyAffordability && propertyAffordability.verdict === 'RENEGOTIATE') || (propertyAffordability && propertyAffordability.verdict === 'AFFORDABLE_WITH_CONDITIONS')) {
    rating = 'CONDITIONAL'
    bindingConstraint = missingInformation.length > 0 ? 'Missing information' : `Selected property: ${propertyAffordability?.verdict === 'RENEGOTIATE' ? 'RENEGOTIATE' : 'AFFORDABLE WITH CONDITIONS'}`
    why.push('Viable in principle, but depends on information not yet verified or on renegotiating the current deal.')
  } else if (financials.ebitdaMargin >= 0.15 && (!breakEven.hasCapacity || breakEven.breakEvenOccupancy === null || breakEven.breakEvenOccupancy <= 0.75) && majorRisks.length === 0) {
    rating = 'STRONG'
    bindingConstraint = 'None — center clears every check with margin to spare'
    why.push(`EBITDA margin is ${formatPercent(financials.ebitdaMargin)} with a comfortable break-even cushion.`)
  } else {
    rating = 'VIABLE'
    bindingConstraint = 'Operating margin'
    why.push(`Profitable today (${formatPercent(financials.ebitdaMargin)} margin), without a disqualifying risk, but not yet a strong cushion.`)
  }

  return { rating, bindingConstraint, why, majorRisks, missingInformation, actionsThatImprove }
}
