/**
 * All money is stored and computed as integer cents to avoid floating-point
 * drift in financial calculations (spec §59). `Money` is a branded number so
 * a raw dollar float can't be passed where cents are expected by accident.
 */
export type Money = number & { readonly __brand: 'Money' }

export const cents = (value: number): Money => Math.round(value) as Money

export const fromDollars = (dollars: number): Money => cents(dollars * 100)

export const toDollars = (m: Money): number => m / 100

export const zeroMoney = 0 as Money

export const addMoney = (...values: Money[]): Money =>
  cents(values.reduce((sum, v) => sum + v, 0))

export const subMoney = (a: Money, b: Money): Money => cents(a - b)

export const mulMoney = (a: Money, factor: number): Money => cents(a * factor)

export const divMoney = (a: Money, divisor: number): Money =>
  divisor === 0 ? zeroMoney : cents(a / divisor)

export const formatMoney = (m: Money | undefined | null): string => {
  if (m === undefined || m === null || Number.isNaN(m)) return '—'
  return toDollars(m).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const formatPercent = (ratio: number | undefined | null, digits = 1): string => {
  if (ratio === undefined || ratio === null || Number.isNaN(ratio)) return '—'
  return `${(ratio * 100).toFixed(digits)}%`
}
