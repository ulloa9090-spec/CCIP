import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computeAgeGroupStaffing, computeStaffingSummary, regulatoryMinStaffFor } from '../staffing'
import type { AgeGroup } from '../types'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Infants',
  minAgeMonths: 6,
  maxAgeMonths: 18,
  order: 0,
  capacity: 12,
  enrolled: 7,
  privatePay: 5,
  subsidized: 2,
  weeklyTuition: fromDollars(325),
  subsidyWeeklyRate: fromDollars(300),
  registrationFeeAnnual: fromDollars(100),
  discountPct: 0,
  plannedStaffCount: 1,
  staffMonthlyCostPerEmployee: fromDollars(2900),
  ...overrides,
})

describe('regulatoryMinStaffFor', () => {
  it('returns null (never 0) when the ratio is UNKNOWN — spec §11, §44', () => {
    expect(regulatoryMinStaffFor(10, undefined)).toBeNull()
  })

  it('returns 0 for an empty classroom, even with a known ratio', () => {
    expect(regulatoryMinStaffFor(0, 4)).toBe(0)
  })

  it('rounds up to the nearest whole staff member', () => {
    expect(regulatoryMinStaffFor(7, 4)).toBe(2) // ceil(7/4)
    expect(regulatoryMinStaffFor(8, 4)).toBe(2) // ceil(8/4)
    expect(regulatoryMinStaffFor(9, 4)).toBe(3) // ceil(9/4)
  })

  it('requires at least 1 staff member whenever any child is enrolled', () => {
    expect(regulatoryMinStaffFor(1, 100)).toBe(1)
  })
})

describe('computeAgeGroupStaffing', () => {
  it('flags understaffing relative to the regulatory minimum', () => {
    const result = computeAgeGroupStaffing(makeGroup({ enrolled: 9, ratioMaxChildrenPerStaff: 4, plannedStaffCount: 1 }), 0)
    expect(result.regulatoryMinStaff).toBe(3)
    expect(result.isUnderMinimum).toBe(true)
  })

  it('does not flag understaffing when the ratio is unverified', () => {
    const result = computeAgeGroupStaffing(makeGroup({ enrolled: 9, ratioMaxChildrenPerStaff: undefined, plannedStaffCount: 1 }), 0)
    expect(result.ratioStatus).toBe('UNKNOWN')
    expect(result.isUnderMinimum).toBe(false)
  })

  it('applies the coverage buffer on top of the regulatory minimum for the operational recommendation', () => {
    const result = computeAgeGroupStaffing(makeGroup({ enrolled: 8, ratioMaxChildrenPerStaff: 4, plannedStaffCount: 3 }), 0.5)
    expect(result.regulatoryMinStaff).toBe(2)
    expect(result.operationalRecommendedStaff).toBe(3) // ceil(2 * 1.5)
  })

  it('computes classroom payroll and labor cost per child', () => {
    const result = computeAgeGroupStaffing(makeGroup({ enrolled: 8, plannedStaffCount: 2, staffMonthlyCostPerEmployee: fromDollars(3000) }), 0)
    expect(result.classroomMonthlyPayroll).toBe(fromDollars(6000))
    expect(result.laborCostPerChildMonthly).toBe(fromDollars(750))
  })

  it('handles zero enrollment without dividing by zero', () => {
    const result = computeAgeGroupStaffing(makeGroup({ enrolled: 0, plannedStaffCount: 0 }), 0)
    expect(result.laborCostPerChildMonthly).toBe(0)
  })
})

describe('computeStaffingSummary', () => {
  it('lists groups with unknown ratios and groups under the regulatory minimum', () => {
    const groups = [
      makeGroup({ id: 'a', ratioMaxChildrenPerStaff: undefined }),
      makeGroup({ id: 'b', ratioMaxChildrenPerStaff: 4, enrolled: 9, plannedStaffCount: 1 }),
    ]
    const summary = computeStaffingSummary(groups, 0)
    expect(summary.groupsWithUnknownRatio).toEqual(['a'])
    expect(summary.groupsUnderMinimum).toEqual(['b'])
  })
})
