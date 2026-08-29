import type { Project, Scenario, ScenarioData } from './types'

/** Pulls the scenario-mutable fields out of a Project (spec §38). */
export const extractScenarioData = (project: Project): ScenarioData => ({
  licensedCapacity: project.licensedCapacity,
  ageGroups: project.ageGroups,
  payrollLineItems: project.payrollLineItems,
  expenseItems: project.expenseItems,
  staffCoverageBufferPct: project.staffCoverageBufferPct,
  targetDSCR: project.targetDSCR,
  targetProfitMarginPct: project.targetProfitMarginPct,
  loanInterestRatePct: project.loanInterestRatePct,
  loanAmortizationYears: project.loanAmortizationYears,
  negotiationBufferPct: project.negotiationBufferPct,
  ownerEquityAvailable: project.ownerEquityAvailable,
  workingCapitalMonths: project.workingCapitalMonths,
  projectCostLineItems: project.projectCostLineItems,
  financingType: project.financingType,
  financingTranches: project.financingTranches,
  requiredEquityPct: project.requiredEquityPct,
  projectionAssumptions: project.projectionAssumptions,
  leaseTerms: project.leaseTerms,
})

/** Merges a scenario's data onto a Project, leaving identity/metadata/properties untouched. */
export const applyScenarioData = (project: Project, data: ScenarioData): Project => ({
  ...project,
  ...data,
})

/**
 * Keeps the active scenario's stored snapshot in sync with the live project
 * fields after every edit, so switching scenarios and switching back doesn't
 * lose work (spec §68: single source of truth, no silently-discarded edits).
 */
export const syncActiveScenario = (project: Project): Project => ({
  ...project,
  scenarios: project.scenarios.map((s) => (s.id === project.activeScenarioId ? { ...s, data: extractScenarioData(project) } : s)),
})

export const findScenario = (project: Project, id: string): Scenario | undefined => project.scenarios.find((s) => s.id === id)
