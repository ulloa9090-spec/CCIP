import { describe, expect, it } from 'vitest'
import { addMoney, divMoney, formatMoney, formatPercent, fromDollars, mulMoney, subMoney } from '../money'

describe('money (integer cents)', () => {
  it('converts dollars to whole cents', () => {
    expect(fromDollars(1250)).toBe(125000)
    expect(fromDollars(19.99)).toBe(1999)
  })

  it('avoids floating point drift across repeated addition', () => {
    const dime = fromDollars(0.1)
    let total = 0 as ReturnType<typeof fromDollars>
    for (let i = 0; i < 10; i++) total = addMoney(total, dime)
    expect(total).toBe(fromDollars(1)) // 10 × $0.10 === $1.00 exactly, unlike raw floats
  })

  it('rounds mul/div results to whole cents', () => {
    expect(mulMoney(fromDollars(10), 1 / 3)).toBe(333)
    expect(divMoney(fromDollars(10), 3)).toBe(333)
  })

  it('subtracts money', () => {
    expect(subMoney(fromDollars(10), fromDollars(3))).toBe(fromDollars(7))
  })

  it('formats currency', () => {
    expect(formatMoney(fromDollars(1250))).toBe('$1,250.00')
    expect(formatMoney(undefined)).toBe('—')
  })

  it('formats percentages', () => {
    expect(formatPercent(0.853)).toBe('85.3%')
    expect(formatPercent(undefined)).toBe('—')
  })
})
