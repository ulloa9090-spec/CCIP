import { subMoney, type Money } from './money'
import type { PayrollSummary } from './payroll'
import type { ExpenseSummary } from './expenses'
import type { RevenueSummary } from './revenue'

export interface FinancialSummary {
  totalMonthlyRevenue: Money
  totalAnnualRevenue: Money
  totalMonthlyPayroll: Money
  totalAnnualPayroll: Money
  totalMonthlyOpex: Money
  totalAnnualOpex: Money
  ebitdaMonthly: Money
  ebitdaAnnual: Money
  ebitdaMargin: number
  /** Phase 1: no debt/rent modeled yet, so cash flow equals EBITDA (Phase 3 subtracts occupancy cost). */
  cashFlowMonthly: Money
  payrollPctOfRevenue: number
  opexPctOfRevenue: number
}

export const computeFinancialSummary = (
  revenue: RevenueSummary,
  payroll: PayrollSummary,
  expenses: ExpenseSummary,
): FinancialSummary => {
  const ebitdaMonthly = subMoney(
    subMoney(revenue.totalMonthlyRevenue, payroll.totalMonthlyPayroll),
    expenses.totalMonthlyOpex,
  )
  const ebitdaAnnual = subMoney(
    subMoney(revenue.totalAnnualRevenue, payroll.totalAnnualPayroll),
    expenses.totalAnnualOpex,
  )

  const rev = revenue.totalMonthlyRevenue
  return {
    totalMonthlyRevenue: revenue.totalMonthlyRevenue,
    totalAnnualRevenue: revenue.totalAnnualRevenue,
    totalMonthlyPayroll: payroll.totalMonthlyPayroll,
    totalAnnualPayroll: payroll.totalAnnualPayroll,
    totalMonthlyOpex: expenses.totalMonthlyOpex,
    totalAnnualOpex: expenses.totalAnnualOpex,
    ebitdaMonthly,
    ebitdaAnnual,
    ebitdaMargin: rev > 0 ? ebitdaMonthly / rev : 0,
    cashFlowMonthly: ebitdaMonthly,
    payrollPctOfRevenue: rev > 0 ? payroll.totalMonthlyPayroll / rev : 0,
    opexPctOfRevenue: rev > 0 ? expenses.totalMonthlyOpex / rev : 0,
  }
}
