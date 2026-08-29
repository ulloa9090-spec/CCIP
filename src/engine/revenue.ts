import { addMoney, cents, divMoney, mulMoney, zeroMoney, type Money } from './money'
import type { AgeGroup } from './types'

/**
 * Monthly-equivalent conversion. Must be weekly × 52 / 12, never weekly × 4
 * (spec §7) — a childcare year has 52 weekly billing cycles, not 48.
 */
export const weeklyToMonthly = (weekly: Money): Money => cents((weekly * 52) / 12)
export const weeklyToAnnual = (weekly: Money): Money => mulMoney(weekly, 52)

export interface AgeGroupRevenue {
  ageGroupId: string
  occupancy: number
  availableSpaces: number
  grossWeeklyRevenue: Money
  weeklyRevenueAfterDiscount: Money
  monthlyTuitionRevenue: Money
  annualTuitionRevenue: Money
  monthlyFeeRevenue: Money
  annualFeeRevenue: Money
  totalMonthlyRevenue: Money
  totalAnnualRevenue: Money
  revenuePerChildMonthly: Money
  monthlyRevenueAtFullCapacity: Money
  lostMonthlyRevenue: Money
}

export const computeAgeGroupRevenue = (group: AgeGroup): AgeGroupRevenue => {
  const grossWeeklyRevenue = addMoney(
    mulMoney(group.weeklyTuition, group.privatePay),
    mulMoney(group.subsidyWeeklyRate, group.subsidized),
  )
  const weeklyRevenueAfterDiscount = mulMoney(grossWeeklyRevenue, 1 - group.discountPct)

  const monthlyTuitionRevenue = weeklyToMonthly(weeklyRevenueAfterDiscount)
  const annualTuitionRevenue = weeklyToAnnual(weeklyRevenueAfterDiscount)

  const annualFeeRevenue = mulMoney(group.registrationFeeAnnual, group.enrolled)
  const monthlyFeeRevenue = divMoney(annualFeeRevenue, 12)

  const totalMonthlyRevenue = addMoney(monthlyTuitionRevenue, monthlyFeeRevenue)
  const totalAnnualRevenue = addMoney(annualTuitionRevenue, annualFeeRevenue)

  const revenuePerChildMonthly =
    group.enrolled > 0 ? divMoney(totalMonthlyRevenue, group.enrolled) : zeroMoney

  const monthlyRevenueAtFullCapacity =
    group.enrolled > 0
      ? mulMoney(revenuePerChildMonthly, group.capacity)
      : mulMoney(weeklyToMonthly(group.weeklyTuition), group.capacity)

  const availableSpaces = Math.max(group.capacity - group.enrolled, 0)
  const lostMonthlyRevenue = mulMoney(revenuePerChildMonthly, availableSpaces)

  return {
    ageGroupId: group.id,
    occupancy: group.capacity > 0 ? group.enrolled / group.capacity : 0,
    availableSpaces,
    grossWeeklyRevenue,
    weeklyRevenueAfterDiscount,
    monthlyTuitionRevenue,
    annualTuitionRevenue,
    monthlyFeeRevenue,
    annualFeeRevenue,
    totalMonthlyRevenue,
    totalAnnualRevenue,
    revenuePerChildMonthly,
    monthlyRevenueAtFullCapacity,
    lostMonthlyRevenue,
  }
}

export interface RevenueSummary {
  byGroup: AgeGroupRevenue[]
  totalCapacity: number
  totalEnrolled: number
  occupancy: number
  availableSpaces: number
  totalMonthlyRevenue: Money
  totalAnnualRevenue: Money
  monthlyRevenueAtFullCapacity: Money
  lostMonthlyRevenue: Money
  weightedAvgWeeklyTuition: Money
}

export const computeRevenueSummary = (ageGroups: AgeGroup[]): RevenueSummary => {
  const byGroup = ageGroups.map(computeAgeGroupRevenue)

  const totalCapacity = ageGroups.reduce((sum, g) => sum + g.capacity, 0)
  const totalEnrolled = ageGroups.reduce((sum, g) => sum + g.enrolled, 0)

  const totalMonthlyRevenue = addMoney(zeroMoney, ...byGroup.map((g) => g.totalMonthlyRevenue))
  const totalAnnualRevenue = addMoney(zeroMoney, ...byGroup.map((g) => g.totalAnnualRevenue))
  const monthlyRevenueAtFullCapacity = addMoney(
    zeroMoney,
    ...byGroup.map((g) => g.monthlyRevenueAtFullCapacity),
  )
  const lostMonthlyRevenue = addMoney(zeroMoney, ...byGroup.map((g) => g.lostMonthlyRevenue))

  const totalWeeklyGross = addMoney(zeroMoney, ...ageGroups.map((g) => mulMoney(g.weeklyTuition, g.enrolled)))
  const weightedAvgWeeklyTuition = totalEnrolled > 0 ? divMoney(totalWeeklyGross, totalEnrolled) : zeroMoney

  return {
    byGroup,
    totalCapacity,
    totalEnrolled,
    occupancy: totalCapacity > 0 ? totalEnrolled / totalCapacity : 0,
    availableSpaces: Math.max(totalCapacity - totalEnrolled, 0),
    totalMonthlyRevenue,
    totalAnnualRevenue,
    monthlyRevenueAtFullCapacity,
    lostMonthlyRevenue,
    weightedAvgWeeklyTuition,
  }
}
