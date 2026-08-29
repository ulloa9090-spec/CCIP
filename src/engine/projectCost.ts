import { addMoney, mulMoney, zeroMoney, type Money } from './money'
import type { ProjectCostLineItem } from './types'

export interface ProjectCostResult {
  lineItemsTotal: Money
  workingCapitalAmount: Money
  /** Everything except the property itself: renovation, FF&E, closing, professional fees, + working capital. */
  totalNonPropertyCost: Money
  /** True once at least one real cost line item has been entered — otherwise the result is a rough placeholder (spec §65). */
  hasLineItemData: boolean
}

export const computeProjectCost = (
  lineItems: ProjectCostLineItem[],
  workingCapitalMonths: number,
  monthlyPayroll: Money,
  monthlyOpex: Money,
): ProjectCostResult => {
  const lineItemsTotal = addMoney(zeroMoney, ...lineItems.map((i) => i.amount))
  const workingCapitalAmount = mulMoney(addMoney(monthlyPayroll, monthlyOpex), Math.max(0, workingCapitalMonths))

  return {
    lineItemsTotal,
    workingCapitalAmount,
    totalNonPropertyCost: addMoney(lineItemsTotal, workingCapitalAmount),
    hasLineItemData: lineItems.length > 0,
  }
}
