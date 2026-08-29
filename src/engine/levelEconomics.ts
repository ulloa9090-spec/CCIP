import { scaleAgeGroupsToOccupancy } from './enrollmentScaling'
import { computeExpenseSummary } from './expenses'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import { computeRevenueSummary } from './revenue'
import { regulatoryMinStaffFor } from './staffing'
import type { AgeGroup, ExpenseItem } from './types'

/**
 * Staff headcount needed for a group at a hypothetical enrollment level.
 * Uses the verified ratio when available (captures cliffs exactly); when the
 * ratio is UNKNOWN, extrapolates from the operator's own planned
 * staff-per-child intensity rather than inventing a ratio (spec §11) or
 * silently treating the cost as zero (spec §44) — flagged upstream via
 * `hasUnknownRatios` so the result is shown as preliminary (spec §65).
 */
export const neededStaffAt = (group: AgeGroup, enrolled: number): number => {
  const regulatory = regulatoryMinStaffFor(enrolled, group.ratioMaxChildrenPerStaff)
  if (regulatory !== null) return regulatory
  if (enrolled <= 0) return 0
  if (group.capacity <= 0 || group.plannedStaffCount <= 0) return group.plannedStaffCount
  return Math.max(1, Math.ceil(group.plannedStaffCount * (enrolled / group.capacity)))
}

export interface EnrollmentLevelResult {
  children: number
  occupancy: number
  revenue: Money
  ebitda: Money
  margin: number
}

/**
 * Evaluates full unit economics (revenue, ratio-driven staffing cost, flat
 * payroll, OPEX, EBITDA) at a hypothetical occupancy level, scaling the
 * current age-group mix rather than assuming a fixed distribution. Shared by
 * the Break-Even engine (spec §19) and the Reverse Calculation engine (spec
 * §36), which both need to simulate enrollment level-by-level because
 * staffing cliffs make cost non-linear.
 */
export const evaluateEnrollmentLevel = (
  ageGroups: AgeGroup[],
  flatPayroll: Money,
  expenseItems: ExpenseItem[],
  occupancyPct: number,
): EnrollmentLevelResult => {
  const scaled = scaleAgeGroupsToOccupancy(ageGroups, occupancyPct)
  const revenueSummary = computeRevenueSummary(scaled)

  const staffingCost = addMoney(
    zeroMoney,
    ...scaled.map((g) => mulMoney(g.staffMonthlyCostPerEmployee, neededStaffAt(g, g.enrolled))),
  )
  const expenseSummary = computeExpenseSummary(expenseItems, revenueSummary.totalEnrolled, revenueSummary.totalMonthlyRevenue)

  const ebitda = subMoney(subMoney(subMoney(revenueSummary.totalMonthlyRevenue, staffingCost), flatPayroll), expenseSummary.totalMonthlyOpex)

  return {
    children: revenueSummary.totalEnrolled,
    occupancy: revenueSummary.occupancy,
    revenue: revenueSummary.totalMonthlyRevenue,
    ebitda,
    margin: revenueSummary.totalMonthlyRevenue > 0 ? ebitda / revenueSummary.totalMonthlyRevenue : -Infinity,
  }
}
