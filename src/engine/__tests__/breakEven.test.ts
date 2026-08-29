import { describe, expect, it } from 'vitest'
import { MARGIN_TIERS, computeBreakEven } from '../breakEven'
import { fromDollars } from '../money'
import type { AgeGroup, ExpenseItem, PayrollLineItem } from '../types'

const makeGroup = (overrides: Partial<AgeGroup> = {}): AgeGroup => ({
  id: 'g1',
  name: 'Preschool',
  minAgeMonths: 36,
  maxAgeMonths: 48,
  order: 0,
  capacity: 10,
  enrolled: 0,
  privatePay: 0,
  subsidized: 0,
  weeklyTuition: fromDollars(400),
  subsidyWeeklyRate: fromDollars(380),
  registrationFeeAnnual: 0 as never,
  discountPct: 0,
  plannedStaffCount: 1,
  staffMonthlyCostPerEmployee: fromDollars(3000),
  ratioMaxChildrenPerStaff: 5,
  ...overrides,
})

const fixedExpense: ExpenseItem = {
  id: 'rent-like',
  category: 'Other',
  label: 'Fixed Overhead',
  classification: 'FIXED',
  monthlyAmount: fromDollars(2000),
  perChildMonthlyAmount: 0 as never,
  pctOfRevenue: 0,
}

describe('computeBreakEven', () => {
  it('finds the exact break-even child count by simulating enrollment (spec §19), not a linear formula', () => {
    // At $400/wk (~$1733.33/mo/child) against $3000/staff (1:5 ratio) + $2000 fixed:
    // 1-2 children: 1 staff, $5000 cost, revenue too low to cover it.
    // 3 children: revenue ~$5200 vs $5000 cost -> first month at/above break-even.
    const result = computeBreakEven([makeGroup()], [], [fixedExpense])
    expect(result.hasCapacity).toBe(true)
    expect(result.breakEvenChildren).toBe(3)
    expect(result.breakEvenOccupancy).toBeCloseTo(0.3)
    expect(result.breakEvenExceedsCapacity).toBe(false)
  })

  it('requires more children for higher target margins, in non-decreasing order', () => {
    const result = computeBreakEven([makeGroup()], [], [fixedExpense])
    const values = MARGIN_TIERS.map((tier) => result.marginTierChildren[tier])
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== null && values[i - 1] !== null) {
        expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!)
      }
    }
  })

  it('reports break-even exceeding capacity when the cost structure can never be covered', () => {
    const hugeFixed: ExpenseItem = { ...fixedExpense, monthlyAmount: fromDollars(1_000_000) }
    const result = computeBreakEven([makeGroup()], [], [hugeFixed])
    expect(result.breakEvenChildren).toBeNull()
    expect(result.breakEvenExceedsCapacity).toBe(true)
  })

  it('flags results as based on unverified ratios when a group has no ratio set', () => {
    const result = computeBreakEven([makeGroup({ ratioMaxChildrenPerStaff: undefined })], [], [fixedExpense])
    expect(result.hasUnknownRatios).toBe(true)
  })

  it('does not flag unknown ratios when every group has a verified ratio', () => {
    const result = computeBreakEven([makeGroup()], [], [fixedExpense])
    expect(result.hasUnknownRatios).toBe(false)
  })

  it('handles zero total capacity without dividing by zero', () => {
    const result = computeBreakEven([], [], [])
    expect(result.hasCapacity).toBe(false)
    expect(result.breakEvenChildren).toBeNull()
  })

  it('includes flat (non-classroom) payroll in the cost base', () => {
    const flatPayroll: PayrollLineItem[] = [{ id: 'director', title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(4000) }]
    const withDirector = computeBreakEven([makeGroup({ capacity: 20 })], flatPayroll, [fixedExpense])
    const withoutDirector = computeBreakEven([makeGroup({ capacity: 20 })], [], [fixedExpense])
    expect(withDirector.breakEvenChildren ?? Infinity).toBeGreaterThanOrEqual(withoutDirector.breakEvenChildren ?? Infinity)
  })
})
