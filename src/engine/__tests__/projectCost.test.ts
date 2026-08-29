import { describe, expect, it } from 'vitest'
import { fromDollars } from '../money'
import { computeProjectCost } from '../projectCost'
import type { ProjectCostLineItem } from '../types'

describe('computeProjectCost', () => {
  it('sums line items and adds working capital (months × payroll+opex) — spec §31 quick method', () => {
    const items: ProjectCostLineItem[] = [
      { id: 'a', category: 'Renovation', label: 'Renovation', amount: fromDollars(200000) },
      { id: 'b', category: 'FF&E', label: 'FF&E', amount: fromDollars(50000) },
    ]
    const result = computeProjectCost(items, 3, fromDollars(20000), fromDollars(8000))
    expect(result.lineItemsTotal).toBe(fromDollars(250000))
    expect(result.workingCapitalAmount).toBe(fromDollars(3 * 28000))
    expect(result.totalNonPropertyCost).toBe(fromDollars(250000 + 3 * 28000))
    expect(result.hasLineItemData).toBe(true)
  })

  it('flags hasLineItemData as false when no line items have been entered (spec §65)', () => {
    const result = computeProjectCost([], 3, fromDollars(20000), fromDollars(8000))
    expect(result.hasLineItemData).toBe(false)
    expect(result.lineItemsTotal).toBe(0)
    // Working capital is still computed from real payroll/opex data, not invented.
    expect(result.workingCapitalAmount).toBe(fromDollars(3 * 28000))
  })

  it('treats zero working-capital months as zero reserve, not an error', () => {
    const result = computeProjectCost([], 0, fromDollars(20000), fromDollars(8000))
    expect(result.workingCapitalAmount).toBe(0)
  })
})
