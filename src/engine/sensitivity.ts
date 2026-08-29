import { scaleAgeGroupsToOccupancy } from './enrollmentScaling'
import { mulMoney, subMoney, type Money } from './money'
import { computeProject } from './project'
import type { AgeGroup, Project, ProjectCostLineItem } from './types'

export interface SensitivityMetrics {
  ebitdaMonthly: Money
  cashFlowMonthly: Money
  breakEvenChildren: number | null
  maxSustainableLoan: Money
  maxPropertyPrice: Money
}

export interface SensitivityRun {
  label: string
  description: string
  applicable: boolean
  metrics: SensitivityMetrics
  delta: {
    ebitdaMonthly: Money
    breakEvenChildren: number | null
    maxSustainableLoan: Money
    maxPropertyPrice: Money
  }
}

export interface SensitivityAnalysis {
  baseline: SensitivityMetrics
  runs: SensitivityRun[]
}

const metricsOf = (project: Project): SensitivityMetrics => {
  const calc = computeProject(project)
  return {
    ebitdaMonthly: calc.financials.ebitdaMonthly,
    cashFlowMonthly: calc.financials.cashFlowMonthly,
    breakEvenChildren: calc.breakEven.breakEvenChildren,
    maxSustainableLoan: calc.building.maxSustainableLoan,
    maxPropertyPrice: calc.building.maxPropertyPrice,
  }
}

const scaleTuition = (groups: AgeGroup[], factor: number): AgeGroup[] =>
  groups.map((g) => ({ ...g, weeklyTuition: mulMoney(g.weeklyTuition, factor), subsidyWeeklyRate: mulMoney(g.subsidyWeeklyRate, factor) }))

const scaleWages = (project: Project, factor: number): Project => ({
  ...project,
  ageGroups: project.ageGroups.map((g) => ({ ...g, staffMonthlyCostPerEmployee: mulMoney(g.staffMonthlyCostPerEmployee, factor) })),
  payrollLineItems: project.payrollLineItems.map((p) => ({ ...p, monthlyCostPerEmployee: mulMoney(p.monthlyCostPerEmployee, factor) })),
})

const scaleEnrollment = (project: Project, factor: number): Project => {
  const totalCapacity = project.ageGroups.reduce((sum, g) => sum + g.capacity, 0)
  const totalEnrolled = project.ageGroups.reduce((sum, g) => sum + g.enrolled, 0)
  const currentOccupancy = totalCapacity > 0 ? totalEnrolled / totalCapacity : 0
  return { ...project, ageGroups: scaleAgeGroupsToOccupancy(project.ageGroups, currentOccupancy * factor) }
}

const scaleRenovationLikeCosts = (items: ProjectCostLineItem[], factor: number): { items: ProjectCostLineItem[]; matched: boolean } => {
  let matched = false
  const scaled = items.map((i) => {
    if (!i.category.toLowerCase().includes('renovation') && !i.label.toLowerCase().includes('renovation')) return i
    matched = true
    return { ...i, amount: mulMoney(i.amount, factor) }
  })
  return { items: scaled, matched }
}

const diffMetrics = (base: SensitivityMetrics, run: SensitivityMetrics): SensitivityRun['delta'] => ({
  ebitdaMonthly: subMoney(run.ebitdaMonthly, base.ebitdaMonthly),
  breakEvenChildren: run.breakEvenChildren === null || base.breakEvenChildren === null ? null : run.breakEvenChildren - base.breakEvenChildren,
  maxSustainableLoan: subMoney(run.maxSustainableLoan, base.maxSustainableLoan),
  maxPropertyPrice: subMoney(run.maxPropertyPrice, base.maxPropertyPrice),
})

/**
 * Runs the fixed sensitivity presets from spec §39 against the current
 * project, each a full deterministic re-run of the engine on a modified
 * copy — never an estimate or a model guess.
 */
export const computeSensitivityAnalysis = (project: Project): SensitivityAnalysis => {
  const baseline = metricsOf(project)

  const makeRun = (label: string, description: string, modified: Project, applicable = true): SensitivityRun => {
    const metrics = applicable ? metricsOf(modified) : baseline
    return { label, description, applicable, metrics, delta: diffMetrics(baseline, metrics) }
  }

  const renovationDown = scaleRenovationLikeCosts(project.projectCostLineItems, 1.2)

  const runs: SensitivityRun[] = [
    makeRun('Tuition -10%', 'Every group\'s weekly tuition and subsidy rate reduced 10%.', {
      ...project,
      ageGroups: scaleTuition(project.ageGroups, 0.9),
    }),
    makeRun('Tuition +10%', 'Every group\'s weekly tuition and subsidy rate increased 10%.', {
      ...project,
      ageGroups: scaleTuition(project.ageGroups, 1.1),
    }),
    makeRun('Wages +10%', 'Classroom and support/admin staff costs increased 10%.', scaleWages(project, 1.1)),
    makeRun('Enrollment -10%', 'Occupancy scaled to 90% of its current level across the current age-group mix.', scaleEnrollment(project, 0.9)),
    makeRun('Enrollment +10%', 'Occupancy scaled to 110% of its current level (capped at each group\'s capacity).', scaleEnrollment(project, 1.1)),
    makeRun(
      'Renovation +20%',
      'Project cost line items whose category or label mentions "renovation" increased 20%.',
      { ...project, projectCostLineItems: renovationDown.items },
      renovationDown.matched,
    ),
    makeRun('Interest Rate +1%', 'Building Calculator loan rate assumption increased by 1 percentage point.', {
      ...project,
      loanInterestRatePct: project.loanInterestRatePct + 0.01,
    }),
    makeRun('Interest Rate -1%', 'Building Calculator loan rate assumption decreased by 1 percentage point (floored at 0%).', {
      ...project,
      loanInterestRatePct: Math.max(0, project.loanInterestRatePct - 0.01),
    }),
  ]

  return { baseline, runs }
}
