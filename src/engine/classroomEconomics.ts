import { addMoney, divMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import type { AgeGroupRevenue } from './revenue'
import type { AgeGroupStaffing } from './staffing'
import type { AgeGroup, ExpenseItem } from './types'

export interface ClassroomEconomics {
  ageGroupId: string
  children: number
  revenue: Money
  directPayroll: Money
  /** Per-child and %-of-revenue expenses attributed to this group; center-wide fixed costs are excluded (they aren't classroom-direct). */
  directExpenses: Money
  contributionMargin: Money
  revenuePerChild: Money
  laborCostPerChild: Money
  contributionPerChild: Money
}

export const computeClassroomEconomics = (
  ageGroups: AgeGroup[],
  revenueByGroup: AgeGroupRevenue[],
  staffingByGroup: AgeGroupStaffing[],
  expenseItems: ExpenseItem[],
): ClassroomEconomics[] =>
  ageGroups.map((group) => {
    const rev = revenueByGroup.find((r) => r.ageGroupId === group.id)
    const staffing = staffingByGroup.find((s) => s.ageGroupId === group.id)
    const revenue = rev?.totalMonthlyRevenue ?? zeroMoney
    const directPayroll = staffing?.classroomMonthlyPayroll ?? zeroMoney

    const directExpenses = addMoney(
      zeroMoney,
      ...expenseItems.map((item) => {
        if (item.classification === 'PER_CHILD') return mulMoney(item.perChildMonthlyAmount, group.enrolled)
        if (item.classification === 'PCT_REVENUE') return mulMoney(revenue, item.pctOfRevenue)
        return zeroMoney
      }),
    )

    const contributionMargin = subMoney(subMoney(revenue, directPayroll), directExpenses)

    return {
      ageGroupId: group.id,
      children: group.enrolled,
      revenue,
      directPayroll,
      directExpenses,
      contributionMargin,
      revenuePerChild: group.enrolled > 0 ? divMoney(revenue, group.enrolled) : zeroMoney,
      laborCostPerChild: group.enrolled > 0 ? divMoney(directPayroll, group.enrolled) : zeroMoney,
      contributionPerChild: group.enrolled > 0 ? divMoney(contributionMargin, group.enrolled) : zeroMoney,
    }
  })
