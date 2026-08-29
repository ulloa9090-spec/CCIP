import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { applyScenarioData, extractScenarioData, findScenario, syncActiveScenario } from '../scenarios'
import type { Project, Scenario } from '../types'

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Center',
  licensedCapacity: 60,
  ageGroups: [],
  payrollLineItems: [],
  expenseItems: [],
  staffCoverageBufferPct: 0.15,
  targetDSCR: 1.25,
  targetProfitMarginPct: 0.15,
  loanInterestRatePct: 0.075,
  loanAmortizationYears: 25,
  negotiationBufferPct: 0.1,
  ownerEquityAvailable: fromDollars(150000),
  workingCapitalMonths: 3,
  projectCostLineItems: [],
  financingType: 'CUSTOM',
  financingTranches: [],
  requiredEquityPct: 0.1,
  properties: [{ id: 'prop1', address: '123 Main St', askingPrice: fromDollars(400000), proposedOffer: 0 as never, notes: '' }],
  selectedPropertyId: 'prop1',
  scenarios: [],
  activeScenarioId: 'base',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

describe('extractScenarioData / applyScenarioData', () => {
  it('round-trips: extracting then applying to a different project yields the same scenario-relevant fields', () => {
    const source = makeProject({ licensedCapacity: 80, targetDSCR: 1.4 })
    const data = extractScenarioData(source)
    const target = makeProject({ licensedCapacity: 12, targetDSCR: 1.0 })
    const applied = applyScenarioData(target, data)
    expect(applied.licensedCapacity).toBe(80)
    expect(applied.targetDSCR).toBe(1.4)
  })

  it('leaves identity, metadata, and properties untouched when applying scenario data', () => {
    const source = makeProject({ licensedCapacity: 80 })
    const data = extractScenarioData(source)
    const target = makeProject({ id: 'different', name: 'Different Center' })
    const applied = applyScenarioData(target, data)
    expect(applied.id).toBe('different')
    expect(applied.name).toBe('Different Center')
    expect(applied.properties).toBe(target.properties)
    expect(applied.selectedPropertyId).toBe(target.selectedPropertyId)
  })
})

describe('syncActiveScenario', () => {
  it('writes the live project fields back into only the active scenario', () => {
    const base: Scenario = { id: 'base', name: 'Base', data: extractScenarioData(makeProject({ licensedCapacity: 60 })) }
    const optimistic: Scenario = { id: 'optimistic', name: 'Optimistic', data: extractScenarioData(makeProject({ licensedCapacity: 100 })) }
    const project = makeProject({ licensedCapacity: 75, activeScenarioId: 'base', scenarios: [base, optimistic] })

    const synced = syncActiveScenario(project)
    expect(findScenario(synced, 'base')?.data.licensedCapacity).toBe(75)
    expect(findScenario(synced, 'optimistic')?.data.licensedCapacity).toBe(100) // untouched
  })
})

describe('findScenario', () => {
  it('returns undefined for an id that does not exist', () => {
    const project = makeProject({ scenarios: [{ id: 'base', name: 'Base', data: extractScenarioData(makeProject()) }] })
    expect(findScenario(project, 'nope')).toBeUndefined()
  })
})
