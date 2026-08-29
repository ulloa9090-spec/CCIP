import { computeAlerts, type Alert } from './alerts'
import { computeBreakEven, type BreakEvenResult } from './breakEven'
import { computeClassroomEconomics, type ClassroomEconomics } from './classroomEconomics'
import { computeExpenseSummary, type ExpenseSummary } from './expenses'
import { computeFinancialSummary, type FinancialSummary } from './financials'
import { addMoney } from './money'
import { computePayrollSummary, type PayrollSummary } from './payroll'
import { computeRevenueSummary, type RevenueSummary } from './revenue'
import { computeStaffingSummary, type StaffingSummary } from './staffing'
import { detectStaffingCliffs, nextCliffForGroup, type StaffingCliff } from './staffingCliffs'
import type { Project } from './types'
import { validateProject, type ValidationIssue } from './validation'

export interface ProjectCalculation {
  validationIssues: ValidationIssue[]
  revenue: RevenueSummary
  payroll: PayrollSummary
  staffing: StaffingSummary
  staffingCliffs: StaffingCliff[]
  nextCliffs: StaffingCliff[]
  breakEven: BreakEvenResult
  classroomEconomics: ClassroomEconomics[]
  expenses: ExpenseSummary
  financials: FinancialSummary
  alerts: Alert[]
}

/**
 * Single entry point into the deterministic engine graph. Recomputes the
 * whole chain from raw project inputs — Enrollment → Revenue → Staffing →
 * Payroll → OPEX → EBITDA → Break-Even (docs/ARCHITECTURE.md §3) — every
 * node a pure function of the ones above it, so any UI change just calls
 * this again.
 */
export const computeProject = (project: Project): ProjectCalculation => {
  const validationIssues = validateProject(project)

  const revenue = computeRevenueSummary(project.ageGroups)
  const staffing = computeStaffingSummary(project.ageGroups, project.staffCoverageBufferPct)
  const payroll = computePayrollSummary(project.payrollLineItems)

  const totalMonthlyPayroll = addMoney(payroll.totalMonthlyPayroll, staffing.totalClassroomMonthlyPayroll)

  const expenses = computeExpenseSummary(project.expenseItems, revenue.totalEnrolled, revenue.totalMonthlyRevenue)
  const financials = computeFinancialSummary(revenue, totalMonthlyPayroll, expenses)

  const staffingCliffs = detectStaffingCliffs(project.ageGroups)
  const nextCliffs = project.ageGroups.map(nextCliffForGroup).filter((c): c is StaffingCliff => c !== null)
  const breakEven = computeBreakEven(project.ageGroups, project.payrollLineItems, project.expenseItems)
  const classroomEconomics = computeClassroomEconomics(project.ageGroups, revenue.byGroup, staffing.byGroup, project.expenseItems)

  const alerts = computeAlerts(revenue, financials, validationIssues, staffing, nextCliffs, breakEven, project.ageGroups)

  return {
    validationIssues,
    revenue,
    payroll,
    staffing,
    staffingCliffs,
    nextCliffs,
    breakEven,
    classroomEconomics,
    expenses,
    financials,
    alerts,
  }
}

export * from './alerts'
export * from './breakEven'
export * from './classroomEconomics'
export * from './enrollmentScaling'
export * from './expenses'
export * from './financials'
export * from './money'
export * from './payroll'
export * from './revenue'
export * from './staffing'
export * from './staffingCliffs'
export * from './types'
export * from './validation'
