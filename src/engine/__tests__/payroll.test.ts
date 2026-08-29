import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computePayrollSummary } from '../payroll'
import type { PayrollLineItem } from '../types'

describe('computePayrollSummary', () => {
  it('multiplies headcount by cost per employee, per position', () => {
    const items: PayrollLineItem[] = [
      { id: 'director', title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(4500) },
      { id: 'teacher', title: 'Lead Teacher', headcount: 4, monthlyCostPerEmployee: fromDollars(2800) },
    ]
    const result = computePayrollSummary(items)
    expect(result.totalMonthlyPayroll).toBe(fromDollars(4500 + 4 * 2800))
    expect(result.totalAnnualPayroll).toBe(fromDollars((4500 + 4 * 2800) * 12))
    expect(result.totalHeadcount).toBe(5)
  })

  it('returns zero totals for an empty roster', () => {
    const result = computePayrollSummary([])
    expect(result.totalMonthlyPayroll).toBe(0)
    expect(result.totalHeadcount).toBe(0)
  })
})
