import { mulMoney, subMoney, type Money } from './money'
import type { ExpenseSummary } from './expenses'
import type { RevenueSummary } from './revenue'

export interface FinancialSummary {
  totalMonthlyRevenue: Money
  totalAnnualRevenue: Money
  /** Support/admin payroll + classroom staffing payroll, combined. */
  totalMonthlyPayroll: Money
  totalAnnualPayroll: Money
  totalMonthlyOpex: Money
  totalAnnualOpex: Money
  ebitdaMonthly: Money
  ebitdaAnnual: Money
  ebitdaMargin: number
  /** No debt/rent modeled yet (Phase 3 subtracts occupancy cost), so cash flow equals EBITDA. */
  cashFlowMonthly: Money
  payrollPctOfRevenue: number
  opexPctOfRevenue: number
}

export const computeFinancialSummary = (
  revenue: RevenueSummary,
  totalMonthlyPayroll: Money,
  expenses: ExpenseSummary,
): FinancialSummary => {
  const totalAnnualPayroll = mulMoney(totalMonthlyPayroll, 12)

  const ebitdaMonthly = subMoney(subMoney(revenue.totalMonthlyRevenue, totalMonthlyPayroll), expenses.totalMonthlyOpex)
  const ebitdaAnnual = subMoney(subMoney(revenue.totalAnnualRevenue, totalAnnualPayroll), expenses.totalAnnualOpex)

  const rev = revenue.totalMonthlyRevenue
  return {
    totalMonthlyRevenue: revenue.totalMonthlyRevenue,
    totalAnnualRevenue: revenue.totalAnnualRevenue,
    totalMonthlyPayroll,
    totalAnnualPayroll,
    totalMonthlyOpex: expenses.totalMonthlyOpex,
    totalAnnualOpex: expenses.totalAnnualOpex,
    ebitdaMonthly,
    ebitdaAnnual,
    ebitdaMargin: rev > 0 ? ebitdaMonthly / rev : 0,
    cashFlowMonthly: ebitdaMonthly,
    payrollPctOfRevenue: rev > 0 ? totalMonthlyPayroll / rev : 0,
    opexPctOfRevenue: rev > 0 ? expenses.totalMonthlyOpex / rev : 0,
  }
}
