import { describe, expect, it } from 'vitest'
import { maxLoanForPayment, monthlyPaymentForLoan } from '../amortization'
import { fromDollars } from '../money'

describe('monthlyPaymentForLoan / maxLoanForPayment', () => {
  it('are inverses of each other (round trip within a few cents of rounding)', () => {
    const principal = fromDollars(200000)
    const payment = monthlyPaymentForLoan(principal, 0.075, 25)
    const recovered = maxLoanForPayment(payment, 0.075, 25)
    expect(Math.abs(recovered - principal)).toBeLessThan(200) // within $2 of rounding
  })

  it('handles a 0% interest rate as a straight division', () => {
    const principal = fromDollars(120000)
    expect(monthlyPaymentForLoan(principal, 0, 10)).toBe(fromDollars(1000)) // 120000 / 120
    expect(maxLoanForPayment(fromDollars(1000), 0, 10)).toBe(fromDollars(120000))
  })

  it('returns 0 for a 0-year amortization instead of dividing by zero (spec §58)', () => {
    expect(monthlyPaymentForLoan(fromDollars(100000), 0.07, 0)).toBe(0)
    expect(maxLoanForPayment(fromDollars(1000), 0.07, 0)).toBe(0)
  })

  it('a higher interest rate supports a smaller loan for the same monthly payment', () => {
    const payment = fromDollars(1500)
    const loanAt5pct = maxLoanForPayment(payment, 0.05, 25)
    const loanAt9pct = maxLoanForPayment(payment, 0.09, 25)
    expect(loanAt9pct).toBeLessThan(loanAt5pct)
  })

  it('a longer amortization supports a larger loan for the same monthly payment', () => {
    const payment = fromDollars(1500)
    const loan15yr = maxLoanForPayment(payment, 0.07, 15)
    const loan30yr = maxLoanForPayment(payment, 0.07, 30)
    expect(loan30yr).toBeGreaterThan(loan15yr)
  })
})
