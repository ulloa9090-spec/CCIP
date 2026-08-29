import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computeAgeGroupRevenue, computeRevenueSummary, weeklyToMonthly } from '../revenue'
import type { AgeGroup } from '../types'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Infants',
  minAgeMonths: 6,
  maxAgeMonths: 18,
  order: 0,
  capacity: 12,
  enrolled: 10,
  privatePay: 7,
  subsidized: 3,
  weeklyTuition: fromDollars(325),
  subsidyWeeklyRate: fromDollars(300),
  registrationFeeAnnual: fromDollars(100),
  discountPct: 0,
  ...overrides,
})

describe('weeklyToMonthly', () => {
  it('uses weekly × 52 / 12, NOT weekly × 4 (spec §7)', () => {
    const weekly = fromDollars(300)
    const monthly = weeklyToMonthly(weekly)
    expect(monthly).toBe(fromDollars((300 * 52) / 12))
    expect(monthly).not.toBe(fromDollars(300 * 4))
    // The correct monthly equivalent is meaningfully larger than the naive ×4.
    expect(monthly).toBeGreaterThan(fromDollars(300 * 4))
  })
})

describe('computeAgeGroupRevenue', () => {
  it('splits private-pay and subsidized revenue at their own rates', () => {
    const group = makeGroup()
    const result = computeAgeGroupRevenue(group)
    const expectedGrossWeekly = fromDollars(7 * 325 + 3 * 300)
    expect(result.grossWeeklyRevenue).toBe(expectedGrossWeekly)
  })

  it('applies group discount to gross tuition revenue', () => {
    const group = makeGroup({ discountPct: 0.1 })
    const result = computeAgeGroupRevenue(group)
    const gross = fromDollars(7 * 325 + 3 * 300)
    expect(result.weeklyRevenueAfterDiscount).toBe(Math.round(gross * 0.9))
  })

  it('computes occupancy and available spaces', () => {
    const result = computeAgeGroupRevenue(makeGroup({ capacity: 12, enrolled: 10 }))
    expect(result.occupancy).toBeCloseTo(10 / 12)
    expect(result.availableSpaces).toBe(2)
  })

  it('treats a full group as having zero lost revenue', () => {
    const result = computeAgeGroupRevenue(makeGroup({ capacity: 10, enrolled: 10, privatePay: 10, subsidized: 0 }))
    expect(result.availableSpaces).toBe(0)
    expect(result.lostMonthlyRevenue).toBe(0)
  })

  it('handles an empty group (zero enrolled) without dividing by zero', () => {
    const result = computeAgeGroupRevenue(makeGroup({ enrolled: 0, privatePay: 0, subsidized: 0, capacity: 12 }))
    expect(result.revenuePerChildMonthly).toBe(0)
    expect(result.totalMonthlyRevenue).toBe(0)
    expect(result.monthlyRevenueAtFullCapacity).toBeGreaterThan(0) // falls back to list tuition × capacity
  })

  it('handles a zero-capacity group without dividing by zero', () => {
    const result = computeAgeGroupRevenue(makeGroup({ capacity: 0, enrolled: 0, privatePay: 0, subsidized: 0 }))
    expect(result.occupancy).toBe(0)
    expect(result.availableSpaces).toBe(0)
  })
})

describe('computeRevenueSummary', () => {
  it('aggregates capacity, enrollment, and revenue across groups', () => {
    const groups = [
      makeGroup({ id: 'infants', capacity: 12, enrolled: 10, privatePay: 7, subsidized: 3 }),
      makeGroup({
        id: 'preschool',
        name: 'Preschool',
        capacity: 20,
        enrolled: 20,
        privatePay: 20,
        subsidized: 0,
        weeklyTuition: fromDollars(250),
        subsidyWeeklyRate: fromDollars(220),
      }),
    ]
    const summary = computeRevenueSummary(groups)
    expect(summary.totalCapacity).toBe(32)
    expect(summary.totalEnrolled).toBe(30)
    expect(summary.occupancy).toBeCloseTo(30 / 32)
    expect(summary.totalMonthlyRevenue).toBeGreaterThan(0)
    expect(summary.totalAnnualRevenue).toBeGreaterThan(summary.totalMonthlyRevenue)
  })

  it('is not tied to any specific licensed capacity (works for 30, 60, 100...)', () => {
    for (const capacity of [30, 40, 50, 60, 75, 100]) {
      const groups = [makeGroup({ capacity, enrolled: capacity, privatePay: capacity, subsidized: 0 })]
      const summary = computeRevenueSummary(groups)
      expect(summary.totalCapacity).toBe(capacity)
      expect(summary.occupancy).toBe(1)
    }
  })
})
