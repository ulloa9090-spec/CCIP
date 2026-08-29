import { create } from 'zustand'
import { computeProject, type ProjectCalculation } from '../engine'
import type { AgeGroup, ExpenseItem, PayrollLineItem, Project } from '../engine/types'
import { generateId } from '../lib/id'
import { indexedDbRepository } from '../persistence/indexedDbRepository'
import type { ProjectRepository } from '../persistence/repository'
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

  init: () => Promise<void>
  newProject: (name?: string) => Promise<void>
  selectProject: (id: string) => Promise<void>
  saveProject: () => Promise<void>
  duplicateProject: () => Promise<void>
  renameProject: (name: string) => void
  deleteProject: (id: string) => Promise<void>

  setLicensedCapacity: (capacity: number) => void
  addAgeGroup: () => void
  removeAgeGroup: (id: string) => void
  updateAgeGroup: (id: string, patch: Partial<AgeGroup>) => void

  addPayrollLineItem: () => void
  removePayrollLineItem: (id: string) => void
  updatePayrollLineItem: (id: string, patch: Partial<PayrollLineItem>) => void

  addExpenseItem: () => void
  removeExpenseItem: (id: string) => void
  updateExpenseItem: (id: string, patch: Partial<ExpenseItem>) => void
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
      })
    }, 500)
  }

  const mutate = (updater: (project: Project) => Project) => {
    const current = get().activeProject
    if (!current) return
    const next = touch(updater(current))
    set({ activeProject: next, calculation: recompute(next) })
    persist()
  }

  return {
    repository: indexedDbRepository,
    projects: [],
    activeProject: null,
    calculation: null,
    isLoaded: false,
    isSaving: false,
    lastSavedAt: null,

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
        })
        return
      }
      const active = projects[0]
      set({
        activeProject: active,
        calculation: recompute(active),
        projects: projects.map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
        isLoaded: true,
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
  }
})
