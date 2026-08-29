import { computeAlerts, type Alert } from './alerts'
import { computeBreakEven, type BreakEvenResult } from './breakEven'
import { computeBuildingAffordability, type BuildingAffordabilityResult } from './buildingAffordability'
import { computeClassroomEconomics, type ClassroomEconomics } from './classroomEconomics'
import { computeDecision, type DecisionResult } from './decisionEngine'
import { computeExpenseSummary, type ExpenseSummary } from './expenses'
import { computeFinancialSummary, type FinancialSummary } from './financials'
import { computeFinancingStructure, computeSourcesAndUses, type FinancingStructureResult, type SourcesUsesResult } from './financing'
import { computeLeaseVsPurchase, type LeaseVsPurchaseResult } from './leaseComparison'
import { addMoney } from './money'
import { computePayrollSummary, type PayrollSummary } from './payroll'
import { computeAnnualProjection, type AnnualProjection } from './projection'
import { computePropertyAffordability, type PropertyAffordabilityResult } from './propertyAnalysis'
import { computeRevenueSummary, type RevenueSummary } from './revenue'
import { computeReverseCalculation, type ReverseCalculationResult } from './reverseCalculation'
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
  building: BuildingAffordabilityResult
  financingStructure: FinancingStructureResult
  sourcesUses: SourcesUsesResult
  propertyAffordability: PropertyAffordabilityResult | null
  reverseCalculation: ReverseCalculationResult
  annualProjection: AnnualProjection
  leaseVsPurchase: LeaseVsPurchaseResult
  decision: DecisionResult
  alerts: Alert[]
}

/**
 * Single entry point into the deterministic engine graph. Recomputes the
 * whole chain from raw project inputs — Enrollment → Revenue → Staffing →
 * Payroll → OPEX → EBITDA → Break-Even (docs/ARCHITECTURE.md §3) — every
 * node a pure function of the ones above it, so any UI change just calls
 * this again. Lives in its own module (not index.ts) so other engine
 * modules — Sensitivity Analysis in particular — can call it without a
 * circular import through the barrel file.
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
  const building = computeBuildingAffordability(project, financials)

  const financingStructure = computeFinancingStructure(project.financingTranches)
  const selectedProperty = project.properties.find((p) => p.id === project.selectedPropertyId) ?? null
  const sourcesUses = computeSourcesAndUses(
    project.ownerEquityAvailable,
    project.financingTranches,
    selectedProperty ? (selectedProperty.proposedOffer > 0 ? selectedProperty.proposedOffer : selectedProperty.askingPrice) : null,
    project.projectCostLineItems.map((i) => ({ label: i.label, amount: i.amount })),
    building.projectCost.workingCapitalAmount,
  )
  const propertyAffordability = selectedProperty ? computePropertyAffordability(selectedProperty, project, financials, building) : null
  const reverseCalculation = computeReverseCalculation(selectedProperty, project, building.projectCost)
  const annualProjection = computeAnnualProjection(project, financials)
  const leaseVsPurchase = computeLeaseVsPurchase(project, building, selectedProperty)
  const decision = computeDecision(financials, breakEven, building, staffing, propertyAffordability, project.ageGroups)

  const alerts = computeAlerts(
    revenue,
    financials,
    validationIssues,
    staffing,
    nextCliffs,
    breakEven,
    building,
    propertyAffordability,
    project.ageGroups,
  )

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
    building,
    financingStructure,
    sourcesUses,
    propertyAffordability,
    reverseCalculation,
    annualProjection,
    leaseVsPurchase,
    decision,
    alerts,
  }
}
