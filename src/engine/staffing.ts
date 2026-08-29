import { addMoney, divMoney, mulMoney, zeroMoney, type Money } from './money'
import type { AgeGroup } from './types'

/**
 * Regulatory minimum headcount for a given enrollment under a ratio.
 * Returns `null` (never `0`) when the ratio itself is UNKNOWN, so callers
 * never mistake "not verified" for "no staff required" (spec §11, §44).
 */
export const regulatoryMinStaffFor = (enrolled: number, ratioMaxChildrenPerStaff?: number): number | null => {
  if (ratioMaxChildrenPerStaff === undefined || ratioMaxChildrenPerStaff <= 0) return null
  if (enrolled <= 0) return 0
  return Math.max(1, Math.ceil(enrolled / ratioMaxChildrenPerStaff))
}

export interface AgeGroupStaffing {
  ageGroupId: string
  ratioStatus: 'SET' | 'UNKNOWN'
  regulatoryMinStaff: number | null
  operationalRecommendedStaff: number | null
  plannedStaff: number
  isUnderMinimum: boolean
  isUnderRecommended: boolean
  classroomMonthlyPayroll: Money
  laborCostPerChildMonthly: Money
}

export const computeAgeGroupStaffing = (group: AgeGroup, coverageBufferPct: number): AgeGroupStaffing => {
  const regulatoryMinStaff = regulatoryMinStaffFor(group.enrolled, group.ratioMaxChildrenPerStaff)
  const operationalRecommendedStaff =
    regulatoryMinStaff === null ? null : Math.max(regulatoryMinStaff, Math.ceil(regulatoryMinStaff * (1 + coverageBufferPct)))

  const classroomMonthlyPayroll = mulMoney(group.staffMonthlyCostPerEmployee, group.plannedStaffCount)
  const laborCostPerChildMonthly = group.enrolled > 0 ? divMoney(classroomMonthlyPayroll, group.enrolled) : zeroMoney

  return {
    ageGroupId: group.id,
    ratioStatus: regulatoryMinStaff === null ? 'UNKNOWN' : 'SET',
    regulatoryMinStaff,
    operationalRecommendedStaff,
    plannedStaff: group.plannedStaffCount,
    isUnderMinimum: regulatoryMinStaff !== null && group.plannedStaffCount < regulatoryMinStaff,
    isUnderRecommended: operationalRecommendedStaff !== null && group.plannedStaffCount < operationalRecommendedStaff,
    classroomMonthlyPayroll,
    laborCostPerChildMonthly,
  }
}

export interface StaffingSummary {
  byGroup: AgeGroupStaffing[]
  totalPlannedClassroomStaff: number
  totalClassroomMonthlyPayroll: Money
  groupsWithUnknownRatio: string[]
  groupsUnderMinimum: string[]
}

export const computeStaffingSummary = (ageGroups: AgeGroup[], coverageBufferPct: number): StaffingSummary => {
  const byGroup = ageGroups.map((g) => computeAgeGroupStaffing(g, coverageBufferPct))

  return {
    byGroup,
    totalPlannedClassroomStaff: ageGroups.reduce((sum, g) => sum + g.plannedStaffCount, 0),
    totalClassroomMonthlyPayroll: addMoney(zeroMoney, ...byGroup.map((g) => g.classroomMonthlyPayroll)),
    groupsWithUnknownRatio: byGroup.filter((g) => g.ratioStatus === 'UNKNOWN').map((g) => g.ageGroupId),
    groupsUnderMinimum: byGroup.filter((g) => g.isUnderMinimum).map((g) => g.ageGroupId),
  }
}
