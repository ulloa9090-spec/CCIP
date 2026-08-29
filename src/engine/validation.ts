import { regulatoryMinStaffFor } from './staffing'
import type { AgeGroup, ExpenseItem, FinancingTranche, PayrollLineItem, Project, ProjectCostLineItem, PropertyRecord } from './types'

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
  if (group.ratioMaxChildrenPerStaff !== undefined && group.ratioMaxChildrenPerStaff <= 0) {
    issues.push({ severity: 'ERROR', field: `${path}.ratioMaxChildrenPerStaff`, message: `${group.name}: child:staff ratio must be greater than zero.` })
  }
  if (group.plannedStaffCount < 0 || group.staffMonthlyCostPerEmployee < 0) {
    issues.push({ severity: 'ERROR', field: `${path}.plannedStaffCount`, message: `${group.name}: staffing counts and costs cannot be negative.` })
  }

  const regulatoryMinStaff = regulatoryMinStaffFor(group.enrolled, group.ratioMaxChildrenPerStaff)
  if (regulatoryMinStaff !== null && group.plannedStaffCount < regulatoryMinStaff) {
    issues.push({
      severity: 'CRITICAL',
      field: `${path}.plannedStaffCount`,
      message: `${group.name}: planned staff (${group.plannedStaffCount}) is below the regulatory minimum (${regulatoryMinStaff}) for ${group.enrolled} children at a 1:${group.ratioMaxChildrenPerStaff} ratio.`,
    })
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

export const validateProjectCostLineItem = (item: ProjectCostLineItem): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  if (item.amount < 0) issues.push({ severity: 'ERROR', field: `projectCost:${item.id}`, message: `${item.label}: amount cannot be negative.` })
  return issues
}

/** Building-affordability assumptions (spec §58: 0-year amortization and invalid interest are hard errors). */
export const validateFinancingAssumptions = (project: Project): ValidationIssue[] => {
  const issues: ValidationIssue[] = []

  if (project.targetDSCR <= 0) {
    issues.push({ severity: 'ERROR', field: 'targetDSCR', message: 'Target DSCR must be greater than zero.' })
  }
  if (project.targetProfitMarginPct < 0 || project.targetProfitMarginPct > 1) {
    issues.push({ severity: 'ERROR', field: 'targetProfitMarginPct', message: 'Target profit margin must be between 0% and 100%.' })
  }
  if (project.loanInterestRatePct < 0) {
    issues.push({ severity: 'ERROR', field: 'loanInterestRatePct', message: 'Interest rate cannot be negative.' })
  }
  if (project.loanAmortizationYears <= 0) {
    issues.push({ severity: 'ERROR', field: 'loanAmortizationYears', message: 'Amortization period must be greater than zero years.' })
  }
  if (project.negotiationBufferPct < 0 || project.negotiationBufferPct > 1) {
    issues.push({ severity: 'ERROR', field: 'negotiationBufferPct', message: 'Negotiation buffer must be between 0% and 100%.' })
  }
  if (project.ownerEquityAvailable < 0) {
    issues.push({ severity: 'ERROR', field: 'ownerEquityAvailable', message: 'Owner equity available cannot be negative.' })
  }
  if (project.workingCapitalMonths < 0) {
    issues.push({ severity: 'ERROR', field: 'workingCapitalMonths', message: 'Working capital months cannot be negative.' })
  }
  if (project.requiredEquityPct < 0 || project.requiredEquityPct > 1) {
    issues.push({ severity: 'ERROR', field: 'requiredEquityPct', message: 'Required equity must be between 0% and 100%.' })
  }
  if (project.projectionAssumptions.tuitionGrowthPct < -1) {
    issues.push({ severity: 'ERROR', field: 'projectionAssumptions.tuitionGrowthPct', message: 'Tuition growth cannot be less than -100%.' })
  }
  if (project.projectionAssumptions.expenseInflationPct < -1) {
    issues.push({ severity: 'ERROR', field: 'projectionAssumptions.expenseInflationPct', message: 'Expense inflation cannot be less than -100%.' })
  }
  if (project.projectionAssumptions.wageGrowthPct < -1) {
    issues.push({ severity: 'ERROR', field: 'projectionAssumptions.wageGrowthPct', message: 'Wage growth cannot be less than -100%.' })
  }
  if (project.leaseTerms.baseRentMonthly < 0 || project.leaseTerms.nnnMonthly < 0 || project.leaseTerms.tenantImprovementAllowance < 0) {
    issues.push({ severity: 'ERROR', field: 'leaseTerms', message: 'Lease amounts cannot be negative.' })
  }
  if (project.leaseTerms.annualEscalationPct < 0 || project.leaseTerms.annualEscalationPct > 1) {
    issues.push({ severity: 'ERROR', field: 'leaseTerms.annualEscalationPct', message: 'Lease escalation must be between 0% and 100%.' })
  }
  if (project.leaseTerms.termYears < 0 || project.leaseTerms.securityDepositMonths < 0) {
    issues.push({ severity: 'ERROR', field: 'leaseTerms', message: 'Lease term and deposit cannot be negative.' })
  }

  return issues
}

export const validateFinancingTranche = (tranche: FinancingTranche): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const path = `tranche:${tranche.id}`
  if (tranche.amount < 0) issues.push({ severity: 'ERROR', field: `${path}.amount`, message: `${tranche.label}: amount cannot be negative.` })
  if (tranche.ratePct < 0) issues.push({ severity: 'ERROR', field: `${path}.ratePct`, message: `${tranche.label}: interest rate cannot be negative.` })
  if (tranche.feesPct < 0 || tranche.feesPct > 1) issues.push({ severity: 'ERROR', field: `${path}.feesPct`, message: `${tranche.label}: fees must be between 0% and 100%.` })
  if (tranche.amount > 0 && tranche.amortizationYears <= 0) {
    issues.push({ severity: 'ERROR', field: `${path}.amortizationYears`, message: `${tranche.label}: amortization period must be greater than zero years.` })
  }
  return issues
}

export const validatePropertyRecord = (property: PropertyRecord): ValidationIssue[] => {
  const issues: ValidationIssue[] = []
  const path = `property:${property.id}`
  if (property.askingPrice < 0) issues.push({ severity: 'ERROR', field: `${path}.askingPrice`, message: `${property.address || 'Property'}: asking price cannot be negative.` })
  if (property.proposedOffer < 0) issues.push({ severity: 'ERROR', field: `${path}.proposedOffer`, message: `${property.address || 'Property'}: proposed offer cannot be negative.` })
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
  project.projectCostLineItems.forEach((p) => issues.push(...validateProjectCostLineItem(p)))
  project.financingTranches.forEach((t) => issues.push(...validateFinancingTranche(t)))
  project.properties.forEach((p) => issues.push(...validatePropertyRecord(p)))
  issues.push(...validateFinancingAssumptions(project))

  return issues
}

export const hasErrors = (issues: ValidationIssue[]): boolean =>
  issues.some((i) => i.severity === 'ERROR' || i.severity === 'CRITICAL')
