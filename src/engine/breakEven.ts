import { computeExpenseSummary } from './expenses'
import { scaleAgeGroupsToOccupancy } from './enrollmentScaling'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import { computeRevenueSummary } from './revenue'
import { regulatoryMinStaffFor } from './staffing'
import type { AgeGroup, ExpenseItem, PayrollLineItem } from './types'

export const MARGIN_TIERS = [0.05, 0.1, 0.15, 0.2] as const

/**
 * Staff headcount needed for a group at a hypothetical enrollment level.
 * Uses the verified ratio when available (captures cliffs exactly); when the
 * ratio is UNKNOWN, extrapolates from the operator's own planned
 * staff-per-child intensity rather than inventing a ratio (spec §11) or
 * silently treating the cost as zero (spec §44) — flagged upstream via
 * `hasUnknownRatios` so the result is shown as preliminary (spec §65).
 */
const neededStaffAt = (group: AgeGroup, enrolled: number): number => {
  const regulatory = regulatoryMinStaffFor(enrolled, group.ratioMaxChildrenPerStaff)
  if (regulatory !== null) return regulatory
  if (enrolled <= 0) return 0
  if (group.capacity <= 0 || group.plannedStaffCount <= 0) return group.plannedStaffCount
  return Math.max(1, Math.ceil(group.plannedStaffCount * (enrolled / group.capacity)))
}

interface LevelResult {
  children: number
  occupancy: number
  revenue: Money
  ebitda: Money
  margin: number
}

const evaluateLevel = (
  ageGroups: AgeGroup[],
  flatPayroll: Money,
  expenseItems: ExpenseItem[],
  occupancyPct: number,
): LevelResult => {
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

export interface BreakEvenResult {
  hasCapacity: boolean
  hasUnknownRatios: boolean
  breakEvenChildren: number | null
  breakEvenOccupancy: number | null
  revenueRequired: Money | null
  marginTierChildren: Partial<Record<(typeof MARGIN_TIERS)[number], number | null>>
  breakEvenExceedsCapacity: boolean
}

/**
 * Simulates enrollment child-by-child (via occupancy steps across the
 * current age-group mix) rather than using a single linear formula, because
 * ratio-driven staffing cliffs make cost non-linear in enrollment (spec §19).
 */
export const computeBreakEven = (
  ageGroups: AgeGroup[],
  payrollLineItems: PayrollLineItem[],
  expenseItems: ExpenseItem[],
): BreakEvenResult => {
  const totalCapacity = ageGroups.reduce((sum, g) => sum + g.capacity, 0)
  const hasUnknownRatios = ageGroups.some((g) => g.ratioMaxChildrenPerStaff === undefined && g.capacity > 0)

  if (totalCapacity === 0) {
    return {
      hasCapacity: false,
      hasUnknownRatios,
      breakEvenChildren: null,
      breakEvenOccupancy: null,
      revenueRequired: null,
      marginTierChildren: {},
      breakEvenExceedsCapacity: false,
    }
  }

  const flatPayroll = addMoney(zeroMoney, ...payrollLineItems.map((p) => mulMoney(p.monthlyCostPerEmployee, p.headcount)))

  let breakEvenChildren: number | null = null
  let revenueRequired: Money | null = null
  const marginTierChildren: Partial<Record<(typeof MARGIN_TIERS)[number], number | null>> = {}
  for (const tier of MARGIN_TIERS) marginTierChildren[tier] = null

  for (let children = 0; children <= totalCapacity; children++) {
    const occupancyPct = children / totalCapacity
    const level = evaluateLevel(ageGroups, flatPayroll, expenseItems, occupancyPct)

    if (breakEvenChildren === null && level.ebitda >= 0) {
      breakEvenChildren = level.children
      revenueRequired = level.revenue
    }
    for (const tier of MARGIN_TIERS) {
      if (marginTierChildren[tier] === null && level.margin >= tier) {
        marginTierChildren[tier] = level.children
      }
    }
  }

  return {
    hasCapacity: true,
    hasUnknownRatios,
    breakEvenChildren,
    breakEvenOccupancy: breakEvenChildren === null ? null : breakEvenChildren / totalCapacity,
    revenueRequired,
    marginTierChildren,
    breakEvenExceedsCapacity: breakEvenChildren === null,
  }
}
