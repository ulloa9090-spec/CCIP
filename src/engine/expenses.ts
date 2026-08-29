import { addMoney, mulMoney, zeroMoney, type Money } from './money'
import type { ExpenseItem } from './types'

export interface ExpenseSummary {
  byItem: { id: string; category: string; label: string; monthlyAmount: Money; annualAmount: Money }[]
  totalMonthlyOpex: Money
  totalAnnualOpex: Money
}

/**
 * OPEX depends on enrollment (PER_CHILD) and revenue (PCT_REVENUE), so it
 * must be computed after enrollment/revenue are known — it is a downstream
 * node of Revenue in the dependency graph (docs/ARCHITECTURE.md §3).
 */
export const computeExpenseSummary = (
  items: ExpenseItem[],
  enrolledChildren: number,
  totalMonthlyRevenue: Money,
): ExpenseSummary => {
  const byItem = items.map((item) => {
    let monthlyAmount: Money = zeroMoney
    switch (item.classification) {
      case 'FIXED':
        monthlyAmount = item.monthlyAmount
        break
      case 'PER_CHILD':
        monthlyAmount = mulMoney(item.perChildMonthlyAmount, enrolledChildren)
        break
      case 'PCT_REVENUE':
        monthlyAmount = mulMoney(totalMonthlyRevenue, item.pctOfRevenue)
        break
    }
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      monthlyAmount,
      annualAmount: mulMoney(monthlyAmount, 12),
    }
  })

  const totalMonthlyOpex = addMoney(zeroMoney, ...byItem.map((i) => i.monthlyAmount))

  return { byItem, totalMonthlyOpex, totalAnnualOpex: mulMoney(totalMonthlyOpex, 12) }
}
