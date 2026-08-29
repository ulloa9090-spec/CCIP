import { create } from 'zustand'
import { computeProject, type ProjectCalculation } from '../engine'
import type { Money } from '../engine/money'
import { applyScenarioData, extractScenarioData, syncActiveScenario } from '../engine/scenarios'
import type {
  AgeGroup,
  ExpenseItem,
  FinancingTranche,
  FinancingType,
  LeaseTerms,
  PayrollLineItem,
  Project,
  ProjectCostLineItem,
  ProjectionAssumptions,
  PropertyRecord,
} from '../engine/types'
import { generateId } from '../lib/id'
import type { ProjectRepository } from '../persistence/repository'
import { getPersistenceMode, safeRepository, type PersistenceMode } from '../persistence/safeRepository'
import { createDefaultProject } from './defaultProject'

export interface ProjectListEntry {
  id: string
  name: string
  updatedAt: string
}

interface ProjectStoreState {
  repository: ProjectRepository
  projects: ProjectListEntry[]
  activeProject: Project | null
  calculation: ProjectCalculation | null
  isLoaded: boolean
  isSaving: boolean
  lastSavedAt: string | null
  persistenceMode: PersistenceMode

  init: () => Promise<void>
  newProject: (name?: string) => Promise<void>
  selectProject: (id: string) => Promise<void>
  saveProject: () => Promise<void>
  duplicateProject: () => Promise<void>
  renameProject: (name: string) => void
  deleteProject: (id: string) => Promise<void>

  setLicensedCapacity: (capacity: number) => void
  setStaffCoverageBufferPct: (pct: number) => void
  addAgeGroup: () => void
  removeAgeGroup: (id: string) => void
  updateAgeGroup: (id: string, patch: Partial<AgeGroup>) => void

  addPayrollLineItem: () => void
  removePayrollLineItem: (id: string) => void
  updatePayrollLineItem: (id: string, patch: Partial<PayrollLineItem>) => void

  addExpenseItem: () => void
  removeExpenseItem: (id: string) => void
  updateExpenseItem: (id: string, patch: Partial<ExpenseItem>) => void

  setTargetDSCR: (value: number) => void
  setTargetProfitMarginPct: (value: number) => void
  setLoanInterestRatePct: (value: number) => void
  setLoanAmortizationYears: (value: number) => void
  setNegotiationBufferPct: (value: number) => void
  setOwnerEquityAvailable: (value: Money) => void
  setWorkingCapitalMonths: (value: number) => void

  addProjectCostLineItem: () => void
  removeProjectCostLineItem: (id: string) => void
  updateProjectCostLineItem: (id: string, patch: Partial<ProjectCostLineItem>) => void

  setFinancingType: (type: FinancingType) => void
  setRequiredEquityPct: (value: number) => void
  addFinancingTranche: () => void
  removeFinancingTranche: (id: string) => void
  updateFinancingTranche: (id: string, patch: Partial<FinancingTranche>) => void

  addProperty: () => void
  removeProperty: (id: string) => void
  updateProperty: (id: string, patch: Partial<PropertyRecord>) => void
  selectProperty: (id: string | null) => void

  createScenario: (name: string) => void
  duplicateScenario: (id: string) => void
  selectScenario: (id: string) => void
  renameScenario: (id: string, name: string) => void
  deleteScenario: (id: string) => void

  updateProjectionAssumptions: (patch: Partial<ProjectionAssumptions>) => void
  updateLeaseTerms: (patch: Partial<LeaseTerms>) => void
}

const recompute = (project: Project): ProjectCalculation => computeProject(project)

const touch = (project: Project): Project => ({ ...project, updatedAt: new Date().toISOString() })

let autosaveTimer: ReturnType<typeof setTimeout> | undefined

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  const persist = () => {
    const { activeProject, repository } = get()
    if (!activeProject) return
    clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(async () => {
      set({ isSaving: true })
      await repository.save(activeProject)
      const projects = await repository.list()
      set({
        isSaving: false,
        lastSavedAt: new Date().toISOString(),
        projects: projects.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
        persistenceMode: getPersistenceMode(),
      })
    }, 500)
  }

  const mutate = (updater: (project: Project) => Project) => {
    const current = get().activeProject
    if (!current) return
    const next = syncActiveScenario(touch(updater(current)))
    set({ activeProject: next, calculation: recompute(next) })
    persist()
  }

  return {
    repository: safeRepository,
    projects: [],
    activeProject: null,
    calculation: null,
    isLoaded: false,
    isSaving: false,
    lastSavedAt: null,
    persistenceMode: 'indexeddb',

    init: async () => {
      const { repository } = get()
      const projects = await repository.list()
      if (projects.length === 0) {
        const seeded = createDefaultProject('Sample 60-Child Center')
        await repository.save(seeded)
        set({
          activeProject: seeded,
          calculation: recompute(seeded),
          projects: [{ id: seeded.id, name: seeded.name, updatedAt: seeded.updatedAt }],
          isLoaded: true,
          persistenceMode: getPersistenceMode(),
        })
        return
      }
      const active = projects[0]
      set({
        activeProject: active,
        calculation: recompute(active),
        projects: projects.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
        isLoaded: true,
        persistenceMode: getPersistenceMode(),
      })
    },

    newProject: async (name = 'New Childcare Center') => {
      const { repository } = get()
      const project = createDefaultProject(name)
      await repository.save(project)
      const projects = await repository.list()
      set({
        activeProject: project,
        calculation: recompute(project),
        projects: projects.map(({ id, name: n, updatedAt }) => ({ id, name: n, updatedAt })),
      })
    },

    selectProject: async (id: string) => {
      const { repository } = get()
      const project = await repository.get(id)
      if (!project) return
      set({ activeProject: project, calculation: recompute(project) })
    },

    saveProject: async () => {
      const { activeProject, repository } = get()
      if (!activeProject) return
      set({ isSaving: true })
      await repository.save(activeProject)
      const projects = await repository.list()
      set({
        isSaving: false,
        lastSavedAt: new Date().toISOString(),
        projects: projects.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
      })
    },

    duplicateProject: async () => {
      const { activeProject, repository } = get()
      if (!activeProject) return
      const now = new Date().toISOString()
      const copy: Project = {
        ...activeProject,
        id: generateId('project'),
        name: `${activeProject.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
      }
      await repository.save(copy)
      const projects = await repository.list()
      set({
        activeProject: copy,
        calculation: recompute(copy),
        projects: projects.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
      })
    },

    renameProject: (name: string) => mutate((p) => ({ ...p, name })),

    deleteProject: async (id: string) => {
      const { repository, activeProject } = get()
      await repository.remove(id)
      const projects = await repository.list()
      const remaining = projects.map(({ id: i, name, updatedAt }) => ({ id: i, name, updatedAt }))
      if (activeProject?.id === id) {
        if (remaining.length > 0) {
          const next = await repository.get(remaining[0].id)
          set({ activeProject: next ?? null, calculation: next ? recompute(next) : null, projects: remaining })
        } else {
          const seeded = createDefaultProject()
          await repository.save(seeded)
          set({
            activeProject: seeded,
            calculation: recompute(seeded),
            projects: [{ id: seeded.id, name: seeded.name, updatedAt: seeded.updatedAt }],
          })
        }
      } else {
        set({ projects: remaining })
      }
    },

    setLicensedCapacity: (capacity) => mutate((p) => ({ ...p, licensedCapacity: Math.max(0, Math.round(capacity)) })),
    setStaffCoverageBufferPct: (pct) => mutate((p) => ({ ...p, staffCoverageBufferPct: Math.max(0, pct) })),

    addAgeGroup: () =>
      mutate((p) => ({
        ...p,
        ageGroups: [
          ...p.ageGroups,
          {
            id: generateId('age'),
            name: 'New Age Group',
            minAgeMonths: 0,
            maxAgeMonths: 12,
            order: p.ageGroups.length,
            capacity: 0,
            enrolled: 0,
            privatePay: 0,
            subsidized: 0,
            weeklyTuition: 0 as never,
            subsidyWeeklyRate: 0 as never,
            registrationFeeAnnual: 0 as never,
            discountPct: 0,
            plannedStaffCount: 0,
            staffMonthlyCostPerEmployee: 0 as never,
          },
        ],
      })),

    removeAgeGroup: (id) => mutate((p) => ({ ...p, ageGroups: p.ageGroups.filter((g) => g.id !== id) })),

    updateAgeGroup: (id, patch) =>
      mutate((p) => ({
        ...p,
        ageGroups: p.ageGroups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
      })),

    addPayrollLineItem: () =>
      mutate((p) => ({
        ...p,
        payrollLineItems: [
          ...p.payrollLineItems,
          { id: generateId('pay'), title: 'New Position', headcount: 1, monthlyCostPerEmployee: 0 as never },
        ],
      })),

    removePayrollLineItem: (id) =>
      mutate((p) => ({ ...p, payrollLineItems: p.payrollLineItems.filter((i) => i.id !== id) })),

    updatePayrollLineItem: (id, patch) =>
      mutate((p) => ({
        ...p,
        payrollLineItems: p.payrollLineItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      })),

    addExpenseItem: () =>
      mutate((p) => ({
        ...p,
        expenseItems: [
          ...p.expenseItems,
          {
            id: generateId('exp'),
            category: 'Other',
            label: 'New Expense',
            classification: 'FIXED',
            monthlyAmount: 0 as never,
            perChildMonthlyAmount: 0 as never,
            pctOfRevenue: 0,
          },
        ],
      })),

    removeExpenseItem: (id) => mutate((p) => ({ ...p, expenseItems: p.expenseItems.filter((i) => i.id !== id) })),

    updateExpenseItem: (id, patch) =>
      mutate((p) => ({
        ...p,
        expenseItems: p.expenseItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      })),

    setTargetDSCR: (value) => mutate((p) => ({ ...p, targetDSCR: Math.max(0, value) })),
    setTargetProfitMarginPct: (value) => mutate((p) => ({ ...p, targetProfitMarginPct: Math.max(0, value) })),
    setLoanInterestRatePct: (value) => mutate((p) => ({ ...p, loanInterestRatePct: Math.max(0, value) })),
    setLoanAmortizationYears: (value) => mutate((p) => ({ ...p, loanAmortizationYears: Math.max(0, value) })),
    setNegotiationBufferPct: (value) => mutate((p) => ({ ...p, negotiationBufferPct: Math.max(0, value) })),
    setOwnerEquityAvailable: (value) => mutate((p) => ({ ...p, ownerEquityAvailable: value })),
    setWorkingCapitalMonths: (value) => mutate((p) => ({ ...p, workingCapitalMonths: Math.max(0, value) })),

    addProjectCostLineItem: () =>
      mutate((p) => ({
        ...p,
        projectCostLineItems: [
          ...p.projectCostLineItems,
          { id: generateId('cost'), category: 'Other', label: 'New Cost', amount: 0 as never },
        ],
      })),

    removeProjectCostLineItem: (id) =>
      mutate((p) => ({ ...p, projectCostLineItems: p.projectCostLineItems.filter((i) => i.id !== id) })),

    updateProjectCostLineItem: (id, patch) =>
      mutate((p) => ({
        ...p,
        projectCostLineItems: p.projectCostLineItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      })),

    setFinancingType: (financingType) => mutate((p) => ({ ...p, financingType })),
    setRequiredEquityPct: (value) => mutate((p) => ({ ...p, requiredEquityPct: Math.max(0, value) })),

    addFinancingTranche: () =>
      mutate((p) => {
        const defaultLabel = nextTrancheLabel(p.financingType, p.financingTranches.length)
        return {
          ...p,
          financingTranches: [
            ...p.financingTranches,
            { id: generateId('tranche'), label: defaultLabel, amount: 0 as never, ratePct: 0, amortizationYears: 25, feesPct: 0 },
          ],
        }
      }),

    removeFinancingTranche: (id) =>
      mutate((p) => ({ ...p, financingTranches: p.financingTranches.filter((t) => t.id !== id) })),

    updateFinancingTranche: (id, patch) =>
      mutate((p) => ({
        ...p,
        financingTranches: p.financingTranches.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),

    addProperty: () =>
      mutate((p) => ({
        ...p,
        properties: [
          ...p.properties,
          { id: generateId('property'), address: 'New Property', askingPrice: 0 as never, proposedOffer: 0 as never, notes: '' },
        ],
      })),

    removeProperty: (id) =>
      mutate((p) => ({
        ...p,
        properties: p.properties.filter((prop) => prop.id !== id),
        selectedPropertyId: p.selectedPropertyId === id ? null : p.selectedPropertyId,
      })),

    updateProperty: (id, patch) =>
      mutate((p) => ({
        ...p,
        properties: p.properties.map((prop) => (prop.id === id ? { ...prop, ...patch } : prop)),
      })),

    selectProperty: (id) => mutate((p) => ({ ...p, selectedPropertyId: id })),

    createScenario: (name) =>
      mutate((p) => {
        const scenario = { id: generateId('scenario'), name, data: extractScenarioData(p) }
        return { ...p, scenarios: [...p.scenarios, scenario], activeScenarioId: scenario.id }
      }),

    duplicateScenario: (id) =>
      mutate((p) => {
        const source = p.scenarios.find((s) => s.id === id)
        if (!source) return p
        const scenario = { id: generateId('scenario'), name: `${source.name} (Copy)`, basedOn: source.id, data: source.data }
        return { ...p, scenarios: [...p.scenarios, scenario] }
      }),

    selectScenario: (id) =>
      mutate((p) => {
        const target = p.scenarios.find((s) => s.id === id)
        if (!target) return p
        return applyScenarioData({ ...p, activeScenarioId: id }, target.data)
      }),

    renameScenario: (id, name) =>
      mutate((p) => ({ ...p, scenarios: p.scenarios.map((s) => (s.id === id ? { ...s, name } : s)) })),

    deleteScenario: (id) =>
      mutate((p) => {
        if (p.scenarios.length <= 1) return p // always keep at least one scenario
        const remaining = p.scenarios.filter((s) => s.id !== id)
        if (p.activeScenarioId !== id) return { ...p, scenarios: remaining }
        const next = remaining[0]
        return applyScenarioData({ ...p, scenarios: remaining, activeScenarioId: next.id }, next.data)
      }),

    updateProjectionAssumptions: (patch) => mutate((p) => ({ ...p, projectionAssumptions: { ...p.projectionAssumptions, ...patch } })),
    updateLeaseTerms: (patch) => mutate((p) => ({ ...p, leaseTerms: { ...p.leaseTerms, ...patch } })),
  }
})

const nextTrancheLabel = (type: FinancingType, existingCount: number): string => {
  if (type === 'SBA_504') return existingCount === 0 ? 'Bank First Lien' : existingCount === 1 ? 'CDC/SBA Second Lien' : 'New Tranche'
  if (type === 'SBA_7A') return existingCount === 0 ? 'SBA 7(a) Loan' : 'New Tranche'
  if (type === 'CONVENTIONAL') return existingCount === 0 ? 'Conventional Loan' : 'New Tranche'
  if (type === 'SELLER_FINANCING') return existingCount === 0 ? 'Seller Note' : 'New Tranche'
  if (type === 'OWNER_FINANCING') return existingCount === 0 ? 'Owner Financing' : 'New Tranche'
  return 'New Tranche'
}
