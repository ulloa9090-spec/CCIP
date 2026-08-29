import { describe, expect, it } from 'vitest'
import { computeExpenseSummary } from '../expenses'
import { fromDollars } from '../money'
import type { ExpenseItem } from '../types'

const item = (overrides: Partial<ExpenseItem>): ExpenseItem => ({
  id: 'e1',
  category: 'Food',
  label: 'Food',
  classification: 'FIXED',
  monthlyAmount: 0 as never,
  perChildMonthlyAmount: 0 as never,
  pctOfRevenue: 0,
  ...overrides,
})

describe('computeExpenseSummary', () => {
  it('uses monthlyAmount directly for FIXED expenses', () => {
    const result = computeExpenseSummary([item({ classification: 'FIXED', monthlyAmount: fromDollars(500) })], 30, fromDollars(20000))
    expect(result.totalMonthlyOpex).toBe(fromDollars(500))
  })

  it('multiplies by enrolled children for PER_CHILD expenses', () => {
    const result = computeExpenseSummary(
      [item({ classification: 'PER_CHILD', perChildMonthlyAmount: fromDollars(40) })],
      30,
      fromDollars(20000),
    )
    expect(result.totalMonthlyOpex).toBe(fromDollars(40 * 30))
  })

  it('applies percentage to total monthly revenue for PCT_REVENUE expenses', () => {
    const result = computeExpenseSummary(
      [item({ classification: 'PCT_REVENUE', pctOfRevenue: 0.05 })],
      30,
      fromDollars(20000),
    )
    expect(result.totalMonthlyOpex).toBe(fromDollars(1000))
  })

  it('sums multiple mixed-classification items', () => {
    const items: ExpenseItem[] = [
      item({ id: 'a', classification: 'FIXED', monthlyAmount: fromDollars(500) }),
      item({ id: 'b', classification: 'PER_CHILD', perChildMonthlyAmount: fromDollars(40) }),
      item({ id: 'c', classification: 'PCT_REVENUE', pctOfRevenue: 0.05 }),
    ]
    const result = computeExpenseSummary(items, 30, fromDollars(20000))
    expect(result.totalMonthlyOpex).toBe(fromDollars(500 + 40 * 30 + 1000))
    expect(result.byItem).toHaveLength(3)
  })

  it('handles zero enrollment and zero revenue without error', () => {
    const items: ExpenseItem[] = [
      item({ id: 'a', classification: 'PER_CHILD', perChildMonthlyAmount: fromDollars(40) }),
      item({ id: 'b', classification: 'PCT_REVENUE', pctOfRevenue: 0.1 }),
    ]
    const result = computeExpenseSummary(items, 0, 0 as never)
    expect(result.totalMonthlyOpex).toBe(0)
  })
})
