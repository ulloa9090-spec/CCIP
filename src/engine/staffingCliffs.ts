import { mulMoney, subMoney, type Money } from './money'
import { weeklyToMonthly } from './revenue'
import { regulatoryMinStaffFor } from './staffing'
import type { AgeGroup } from './types'

export interface StaffingCliff {
  ageGroupId: string
  ageGroupName: string
  /** The enrollment count at which one more child requires one more staff member. */
  atChildCount: number
  staffBefore: number
  staffAfter: number
  additionalMonthlyPayroll: Money
  /** Approximate revenue added by that single additional child (private-pay rate). */
  additionalMonthlyRevenue: Money
  netMonthlyImpact: Money
}

/**
 * Walks enrollment 1..capacity for a single group and reports every point
 * where the ratio-driven regulatory minimum staff count increases (spec
 * §12). Requires a verified ratio — returns [] when the ratio is UNKNOWN
 * rather than guessing where a cliff might be.
 */
export const detectStaffingCliffsForGroup = (group: AgeGroup): StaffingCliff[] => {
  if (group.ratioMaxChildrenPerStaff === undefined || group.ratioMaxChildrenPerStaff <= 0) return []

  const cliffs: StaffingCliff[] = []
  let previousStaff = regulatoryMinStaffFor(0, group.ratioMaxChildrenPerStaff) ?? 0

  const perChildMonthlyRevenue = weeklyToMonthly(group.weeklyTuition)

  for (let count = 1; count <= group.capacity; count++) {
    const staff = regulatoryMinStaffFor(count, group.ratioMaxChildrenPerStaff) ?? 0
    if (staff > previousStaff) {
      const additionalMonthlyPayroll = mulMoney(group.staffMonthlyCostPerEmployee, staff - previousStaff)
      cliffs.push({
        ageGroupId: group.id,
        ageGroupName: group.name,
        atChildCount: count,
        staffBefore: previousStaff,
        staffAfter: staff,
        additionalMonthlyPayroll,
        additionalMonthlyRevenue: perChildMonthlyRevenue,
        netMonthlyImpact: subMoney(perChildMonthlyRevenue, additionalMonthlyPayroll),
      })
    }
    previousStaff = staff
  }

  return cliffs
}

export const detectStaffingCliffs = (ageGroups: AgeGroup[]): StaffingCliff[] =>
  ageGroups.flatMap(detectStaffingCliffsForGroup)

/** The single cliff, if any, triggered by enrolling one more child right now. */
export const nextCliffForGroup = (group: AgeGroup): StaffingCliff | null => {
  const all = detectStaffingCliffsForGroup(group)
  return all.find((c) => c.atChildCount === group.enrolled + 1) ?? null
}
