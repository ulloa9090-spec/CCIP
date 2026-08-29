import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { detectStaffingCliffsForGroup, nextCliffForGroup } from '../staffingCliffs'
import type { AgeGroup } from '../types'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Toddlers',
  minAgeMonths: 18,
  maxAgeMonths: 36,
  order: 0,
  capacity: 10,
  enrolled: 4,
  privatePay: 4,
  subsidized: 0,
  weeklyTuition: fromDollars(300),
  subsidyWeeklyRate: fromDollars(280),
  registrationFeeAnnual: fromDollars(100),
  discountPct: 0,
  plannedStaffCount: 1,
  staffMonthlyCostPerEmployee: fromDollars(2800),
  ratioMaxChildrenPerStaff: 4,
  ...overrides,
})

describe('detectStaffingCliffsForGroup', () => {
  it('finds every point where required staff increases for a 1:4 ratio up to capacity 10', () => {
    const cliffs = detectStaffingCliffsForGroup(makeGroup({ capacity: 10 }))
    expect(cliffs.map((c) => c.atChildCount)).toEqual([1, 5, 9])
    expect(cliffs[0]).toMatchObject({ staffBefore: 0, staffAfter: 1 })
    expect(cliffs[1]).toMatchObject({ staffBefore: 1, staffAfter: 2 })
    expect(cliffs[2]).toMatchObject({ staffBefore: 2, staffAfter: 3 })
  })

  it('computes additional payroll and net financial impact at each cliff', () => {
    const cliffs = detectStaffingCliffsForGroup(makeGroup({ capacity: 10, staffMonthlyCostPerEmployee: fromDollars(3000) }))
    expect(cliffs[1].additionalMonthlyPayroll).toBe(fromDollars(3000))
    expect(cliffs[1].netMonthlyImpact).toBe(cliffs[1].additionalMonthlyRevenue - fromDollars(3000))
  })

  it('returns no cliffs when the ratio is UNKNOWN — never invents one (spec §11)', () => {
    expect(detectStaffingCliffsForGroup(makeGroup({ ratioMaxChildrenPerStaff: undefined }))).toEqual([])
  })

  it('returns no cliffs for a zero-capacity group', () => {
    expect(detectStaffingCliffsForGroup(makeGroup({ capacity: 0 }))).toEqual([])
  })
})

describe('nextCliffForGroup', () => {
  it('reports the cliff triggered by enrolling exactly one more child', () => {
    const cliff = nextCliffForGroup(makeGroup({ enrolled: 4, capacity: 10 })) // enrolling child #5 is a cliff
    expect(cliff?.atChildCount).toBe(5)
  })

  it('returns null when the next child does not trigger a cliff', () => {
    const cliff = nextCliffForGroup(makeGroup({ enrolled: 5, capacity: 10 })) // child #6 does not trigger one
    expect(cliff).toBeNull()
  })
})
