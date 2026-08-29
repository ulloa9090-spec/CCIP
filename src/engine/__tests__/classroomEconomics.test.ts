import { describe, expect, it } from 'vitest'
import { computeClassroomEconomics } from '../classroomEconomics'
import { computeRevenueSummary } from '../revenue'
import { computeStaffingSummary } from '../staffing'
import { fromDollars } from '../money'
import type { AgeGroup, ExpenseItem } from '../types'

const group: AgeGroup = {
  id: 'g1',
  name: 'Infants',
  minAgeMonths: 6,
  maxAgeMonths: 18,
  order: 0,
  capacity: 10,
  enrolled: 8,
  privatePay: 8,
  subsidized: 0,
  weeklyTuition: fromDollars(350),
  subsidyWeeklyRate: fromDollars(320),
  registrationFeeAnnual: 0 as never,
  discountPct: 0,
  plannedStaffCount: 2,
  staffMonthlyCostPerEmployee: fromDollars(2900),
}

const expenseItems: ExpenseItem[] = [
  { id: 'food', category: 'Food', label: 'Food', classification: 'PER_CHILD', monthlyAmount: 0 as never, perChildMonthlyAmount: fromDollars(80), pctOfRevenue: 0 },
  { id: 'rent', category: 'Occupancy', label: 'Rent', classification: 'FIXED', monthlyAmount: fromDollars(3000), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 },
]

describe('computeClassroomEconomics', () => {
  it('computes contribution margin from revenue minus direct payroll and direct (variable) expenses only', () => {
    const revenue = computeRevenueSummary([group])
    const staffing = computeStaffingSummary([group], 0)
    const [economics] = computeClassroomEconomics([group], revenue.byGroup, staffing.byGroup, expenseItems)

    const expectedDirectPayroll = fromDollars(2 * 2900)
    const expectedDirectExpenses = fromDollars(8 * 80) // FIXED rent excluded — not classroom-direct
    expect(economics.directPayroll).toBe(expectedDirectPayroll)
    expect(economics.directExpenses).toBe(expectedDirectExpenses)
    expect(economics.contributionMargin).toBe(economics.revenue - expectedDirectPayroll - expectedDirectExpenses)
  })

  it('computes per-child metrics', () => {
    const revenue = computeRevenueSummary([group])
    const staffing = computeStaffingSummary([group], 0)
    const [economics] = computeClassroomEconomics([group], revenue.byGroup, staffing.byGroup, expenseItems)

    expect(economics.revenuePerChild).toBe(Math.round(economics.revenue / 8))
    expect(economics.laborCostPerChild).toBe(Math.round(economics.directPayroll / 8))
  })

  it('handles a group with zero enrollment without dividing by zero', () => {
    const empty: AgeGroup = { ...group, enrolled: 0, privatePay: 0 }
    const revenue = computeRevenueSummary([empty])
    const staffing = computeStaffingSummary([empty], 0)
    const [economics] = computeClassroomEconomics([empty], revenue.byGroup, staffing.byGroup, expenseItems)
    expect(economics.revenuePerChild).toBe(0)
    expect(economics.laborCostPerChild).toBe(0)
  })
})
