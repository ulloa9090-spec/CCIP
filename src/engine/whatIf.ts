import { scaleAgeGroupsToOccupancy } from './enrollmentScaling'
import { addMoney, mulMoney, type Money } from './money'
import { computeProject } from './project'
import type { Project } from './types'

export interface WhatIfInputs {
  deltaChildren: number
  deltaWeeklyTuition: Money
  wagesDeltaPct: number
  interestRateDeltaPct: number
}

export const defaultWhatIfInputs: WhatIfInputs = {
  deltaChildren: 0,
  deltaWeeklyTuition: 0 as Money,
  wagesDeltaPct: 0,
  interestRateDeltaPct: 0,
}

/**
 * Applies a freeform combination of what-if deltas (spec §56) to a project
 * copy — enrollment count, a flat $/week tuition change, a % wage change,
 * and an interest-rate shift — all at once, so the preview reflects
 * questions like "what if I enroll 5 more toddlers AND wages go up 5%?"
 */
export const applyWhatIf = (project: Project, inputs: WhatIfInputs): Project => {
  // Only re-distributes enrollment across groups when a children delta is actually requested — otherwise
  // scaling every group to a single aggregate occupancy % would flatten each group's real individual mix
  // (e.g. one group at 100% and another at 70%) even for a "no-op" preview at zero deltas.
  const enrollmentBase = (() => {
    if (inputs.deltaChildren === 0) return project.ageGroups
    const totalCapacity = project.ageGroups.reduce((sum, g) => sum + g.capacity, 0)
    const totalEnrolled = project.ageGroups.reduce((sum, g) => sum + g.enrolled, 0)
    const targetOccupancy = totalCapacity > 0 ? (totalEnrolled + inputs.deltaChildren) / totalCapacity : 0
    return scaleAgeGroupsToOccupancy(project.ageGroups, Math.max(0, targetOccupancy))
  })()

  const ageGroups = enrollmentBase.map((g) => ({
    ...g,
    weeklyTuition: addMoney(g.weeklyTuition, inputs.deltaWeeklyTuition),
    subsidyWeeklyRate: addMoney(g.subsidyWeeklyRate, inputs.deltaWeeklyTuition),
    staffMonthlyCostPerEmployee: mulMoney(g.staffMonthlyCostPerEmployee, 1 + inputs.wagesDeltaPct),
  }))

  return {
    ...project,
    ageGroups,
    payrollLineItems: project.payrollLineItems.map((p) => ({ ...p, monthlyCostPerEmployee: mulMoney(p.monthlyCostPerEmployee, 1 + inputs.wagesDeltaPct) })),
    loanInterestRatePct: Math.max(0, project.loanInterestRatePct + inputs.interestRateDeltaPct),
  }
}

export const computeWhatIfPreview = (project: Project, inputs: WhatIfInputs) => computeProject(applyWhatIf(project, inputs))
