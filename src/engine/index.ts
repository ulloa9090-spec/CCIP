import { computeAlerts, type Alert } from './alerts'
import { computeExpenseSummary, type ExpenseSummary } from './expenses'
import { computeFinancialSummary, type FinancialSummary } from './financials'
import { computePayrollSummary, type PayrollSummary } from './payroll'
import { computeRevenueSummary, type RevenueSummary } from './revenue'
import type { Project } from './types'
import { validateProject, type ValidationIssue } from './validation'

export interface ProjectCalculation {
  validationIssues: ValidationIssue[]
  revenue: RevenueSummary
  payroll: PayrollSummary
  expenses: ExpenseSummary
  financials: FinancialSummary
  alerts: Alert[]
}

/**
 * Single entry point into the deterministic engine graph. Recomputes the
 * whole chain from raw project inputs — Enrollment → Revenue → Payroll →
 * OPEX → EBITDA → Cash Flow (docs/ARCHITECTURE.md §3) — every node a pure
 * function of the ones above it, so any UI change just calls this again.
 */
export const computeProject = (project: Project): ProjectCalculation => {
  const validationIssues = validateProject(project)

  const revenue = computeRevenueSummary(project.ageGroups)
  const payroll = computePayrollSummary(project.payrollLineItems)
  const expenses = computeExpenseSummary(
    project.expenseItems,
    revenue.totalEnrolled,
    revenue.totalMonthlyRevenue,
  )
  const financials = computeFinancialSummary(revenue, payroll, expenses)
  const alerts = computeAlerts(revenue, financials, validationIssues)

  return { validationIssues, revenue, payroll, expenses, financials, alerts }
}

export * from './alerts'
export * from './expenses'
export * from './financials'
export * from './money'
export * from './payroll'
export * from './revenue'
export * from './types'
export * from './validation'
