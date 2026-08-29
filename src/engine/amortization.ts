import { cents, type Money } from './money'

/**
 * Standard amortization math (spec §26 formula dictionary #18): given a
 * monthly payment, rate, and term, solve for the principal it supports —
 * P = PMT × [(1+r)^n − 1] / [r(1+r)^n], with the r = 0 edge case handled
 * separately (payment × number of periods).
 */
export const maxLoanForPayment = (monthlyPayment: Money, annualRatePct: number, amortizationYears: number): Money => {
  const n = Math.round(amortizationYears * 12)
  if (n <= 0) return 0 as Money
  const r = annualRatePct / 12
  if (r === 0) return cents(monthlyPayment * n)
  const principal = (monthlyPayment * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n))
  return cents(Math.max(0, principal))
}

/** The inverse: monthly payment for a given loan principal, rate, and term. */
export const monthlyPaymentForLoan = (principal: Money, annualRatePct: number, amortizationYears: number): Money => {
  const n = Math.round(amortizationYears * 12)
  if (n <= 0) return 0 as Money
  const r = annualRatePct / 12
  if (r === 0) return cents(principal / n)
  const payment = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return cents(payment)
}
