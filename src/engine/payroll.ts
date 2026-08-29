import { addMoney, mulMoney, zeroMoney, type Money } from './money'
import type { PayrollLineItem } from './types'

export interface PayrollSummary {
  byPosition: { id: string; title: string; monthlyCost: Money; annualCost: Money }[]
  totalMonthlyPayroll: Money
  totalAnnualPayroll: Money
  totalHeadcount: number
}

export const computePayrollSummary = (lineItems: PayrollLineItem[]): PayrollSummary => {
  const byPosition = lineItems.map((item) => {
    const monthlyCost = mulMoney(item.monthlyCostPerEmployee, item.headcount)
    return { id: item.id, title: item.title, monthlyCost, annualCost: mulMoney(monthlyCost, 12) }
  })

  const totalMonthlyPayroll = addMoney(zeroMoney, ...byPosition.map((p) => p.monthlyCost))

  return {
    byPosition,
    totalMonthlyPayroll,
    totalAnnualPayroll: mulMoney(totalMonthlyPayroll, 12),
    totalHeadcount: lineItems.reduce((sum, item) => sum + item.headcount, 0),
  }
}
