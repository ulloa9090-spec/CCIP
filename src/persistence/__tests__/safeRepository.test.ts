import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromDollars = (n: number) => Math.round(n * 100)

const makeProject = (id: string) => ({
  id,
  name: `Project ${id}`,
  licensedCapacity: 10,
  ageGroups: [],
  payrollLineItems: [],
  expenseItems: [],
  staffCoverageBufferPct: 0,
  targetDSCR: 1.25,
  targetProfitMarginPct: 0.1,
  loanInterestRatePct: 0.07,
  loanAmortizationYears: 25,
  negotiationBufferPct: 0.1,
  ownerEquityAvailable: fromDollars(0),
  workingCapitalMonths: 0,
  projectCostLineItems: [],
  financingType: 'CUSTOM' as const,
  financingTranches: [],
  requiredEquityPct: 0.1,
  properties: [],
  selectedPropertyId: null,
  scenarios: [],
  activeScenarioId: 'base',
  projectionAssumptions: { tuitionGrowthPct: 0, expenseInflationPct: 0, wageGrowthPct: 0 },
  leaseTerms: { baseRentMonthly: fromDollars(0), nnnMonthly: fromDollars(0), annualEscalationPct: 0, termYears: 5, securityDepositMonths: 0, tenantImprovementAllowance: fromDollars(0) },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('safeRepository', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses IndexedDB directly when it works, without ever touching the memory fallback', async () => {
    vi.doMock('../indexedDbRepository', () => ({
      indexedDbRepository: {
        list: vi.fn().mockResolvedValue([]),
        get: vi.fn(),
        save: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn(),
      },
    }))
    const { safeRepository, getPersistenceMode } = await import('../safeRepository')
    await safeRepository.list()
    expect(getPersistenceMode()).toBe('indexeddb')
  })

  it('falls back to in-memory storage the moment IndexedDB throws, instead of rejecting', async () => {
    vi.doMock('../indexedDbRepository', () => ({
      indexedDbRepository: {
        list: vi.fn().mockRejectedValue(new Error('IndexedDB blocked in this context')),
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
      },
    }))
    const { safeRepository, getPersistenceMode } = await import('../safeRepository')

    // This must resolve, not throw — an app calling this at startup must never hang forever.
    await expect(safeRepository.list()).resolves.toEqual([])
    expect(getPersistenceMode()).toBe('memory')
  })

  it('once it falls back, stays on memory for the rest of the session even if called again', async () => {
    let callCount = 0
    vi.doMock('../indexedDbRepository', () => ({
      indexedDbRepository: {
        list: vi.fn(() => {
          callCount++
          return Promise.reject(new Error('still blocked'))
        }),
        get: vi.fn(),
        save: vi.fn(),
        remove: vi.fn(),
      },
    }))
    const { safeRepository } = await import('../safeRepository')
    await safeRepository.list()
    await safeRepository.list()
    await safeRepository.list()
    expect(callCount).toBe(1) // only the first call actually tried IndexedDB
  })

  it('persists data written after falling back, so save() -> list() round-trips within the session', async () => {
    vi.doMock('../indexedDbRepository', () => ({
      indexedDbRepository: {
        list: vi.fn().mockRejectedValue(new Error('blocked')),
        get: vi.fn().mockRejectedValue(new Error('blocked')),
        save: vi.fn().mockRejectedValue(new Error('blocked')),
        remove: vi.fn(),
      },
    }))
    const { safeRepository } = await import('../safeRepository')
    const project = makeProject('p1')

    await safeRepository.save(project as never)
    const listed = await safeRepository.list()
    expect(listed.map((p) => p.id)).toContain('p1')
  })
})
