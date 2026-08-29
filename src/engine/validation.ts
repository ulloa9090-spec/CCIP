import type { AgeGroup, ExpenseItem, PayrollLineItem, Project } from './types'

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'CRITICAL'

export interface ValidationIssue {
  severity: ValidationSeverity
  field: string
  message: string
}

/** Per spec §58: Enrollment > Capacity, Private+Subsidized > Enrolled, negative tuition are hard errors. */
export const validateAgeGroup = (group: AgeGroup): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const path = `ageGroup:${group.id}`

  if (group.capacity < 0) issues.push({ severity: 'ERROR', field: `${path}.capacity`, message: `${group.name}: capacity cannot be negative.` })
  if (group.enrolled < 0) issues.push({ severity: 'ERROR', field: `${path}.enrolled`, message: `${group.name}: enrolled cannot be negative.` })
  if (group.enrolled > group.capacity) {
    issues.push({
      severity: 'ERROR',
      field: `${path}.enrolled`,
      message: `${group.name}: enrolled (${group.enrolled}) exceeds capacity (${group.capacity}).`,
    })
  }
  if (group.privatePay + group.subsidized > group.enrolled) {
    issues.push({
      severity: 'ERROR',
      field: `${path}.privatePay`,
      message: `${group.name}: private pay (${group.privatePay}) + subsidized (${group.subsidized}) exceeds enrolled (${group.enrolled}).`,
    })
  }
  if (group.privatePay < 0 || group.subsidized < 0) {
    issues.push({ severity: 'ERROR', field: `${path}.subsidized`, message: `${group.name}: child counts cannot be negative.` })
  }
  if (group.weeklyTuition < 0 || group.subsidyWeeklyRate < 0) {
    issues.push({ severity: 'ERROR', field: `${path}.weeklyTuition`, message: `${group.name}: tuition/subsidy rate cannot be negative.` })
  }
  if (group.discountPct < 0 || group.discountPct > 1) {
    issues.push({ severity: 'ERROR', field: `${path}.discountPct`, message: `${group.name}: discount must be between 0% and 100%.` })
  }
  if (group.minAgeMonths > group.maxAgeMonths) {
    issues.push({ severity: 'WARNING', field: `${path}.minAgeMonths`, message: `${group.name}: minimum age is greater than maximum age.` })
  }

  return issues
}

export const validatePayrollLineItem = (item: PayrollLineItem): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  if (item.headcount < 0) issues.push({ severity: 'ERROR', field: `payroll:${item.id}`, message: `${item.title}: headcount cannot be negative.` })
  if (item.monthlyCostPerEmployee < 0) issues.push({ severity: 'ERROR', field: `payroll:${item.id}`, message: `${item.title}: cost per employee cannot be negative.` })
  return issues
}

export const validateExpenseItem = (item: ExpenseItem): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  if (item.classification === 'PCT_REVENUE' && (item.pctOfRevenue < 0 || item.pctOfRevenue > 1)) {
    issues.push({ severity: 'ERROR', field: `expense:${item.id}`, message: `${item.label}: percent of revenue must be between 0% and 100%.` })
  }
  if (item.monthlyAmount < 0 || item.perChildMonthlyAmount < 0) {
    issues.push({ severity: 'ERROR', field: `expense:${item.id}`, message: `${item.label}: amounts cannot be negative.` })
  }
  return issues
}

export const validateProject = (project: Project): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (project.licensedCapacity < 0) {
    issues.push({ severity: 'ERROR', field: 'licensedCapacity', message: 'Licensed capacity cannot be negative.' })
  }

  const totalGroupCapacity = project.ageGroups.reduce((sum, g) => sum + g.capacity, 0)
  if (totalGroupCapacity > project.licensedCapacity) {
    issues.push({
      severity: 'WARNING',
      field: 'licensedCapacity',
      message: `Age group capacities sum to ${totalGroupCapacity}, which exceeds licensed capacity of ${project.licensedCapacity}.`,
    })
  }

  project.ageGroups.forEach((g) => issues.push(...validateAgeGroup(g)))
  project.payrollLineItems.forEach((p) => issues.push(...validatePayrollLineItem(p)))
  project.expenseItems.forEach((e) => issues.push(...validateExpenseItem(e)))

  return issues
}

export const hasErrors = (issues: ValidationIssue[]): boolean =>
  issues.some((i) => i.severity === 'ERROR' || i.severity === 'CRITICAL')
