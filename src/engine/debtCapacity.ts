import { divMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import type { FinancialSummary } from './financials'

export type BindingConstraintMethod = 'DSCR' | 'TARGET_MARGIN'

export interface DebtCapacityResult {
  noiAnnual: Money
  /** Method A (spec §23): NOI / target DSCR. */
  maxAnnualDebtServiceByDSCR: Money
  /** Method B (spec §24): Revenue − OPEX − Payroll − Required Profit. */
  maxAnnualDebtServiceByMargin: Money
  requiredAnnualProfit: Money
  bindingConstraint: BindingConstraintMethod
  maxAnnualDebtService: Money
  maxMonthlyDebtService: Money
}

/**
 * Compares the DSCR method against the target-margin method and takes the
 * more conservative (lower) of the two, per spec §25 — the recommendation is
 * always the tighter constraint, with the binding one surfaced explicitly.
 */
export const computeDebtCapacity = (
  financials: FinancialSummary,
  targetDSCR: number,
  targetProfitMarginPct: number,
): DebtCapacityResult => {
  const noiAnnual = financials.ebitdaAnnual

  const maxAnnualDebtServiceByDSCR = targetDSCR > 0 ? divMoney(noiAnnual, targetDSCR) : zeroMoney

  const requiredAnnualProfit = mulMoney(financials.totalAnnualRevenue, targetProfitMarginPct)
  const maxAnnualDebtServiceByMargin = subMoney(noiAnnual, requiredAnnualProfit)

  const bindingConstraint: BindingConstraintMethod =
    maxAnnualDebtServiceByMargin <= maxAnnualDebtServiceByDSCR ? 'TARGET_MARGIN' : 'DSCR'

  const maxAnnualDebtService =
    bindingConstraint === 'TARGET_MARGIN' ? maxAnnualDebtServiceByMargin : maxAnnualDebtServiceByDSCR

  return {
    noiAnnual,
    maxAnnualDebtServiceByDSCR,
    maxAnnualDebtServiceByMargin,
    requiredAnnualProfit,
    bindingConstraint,
    maxAnnualDebtService: maxAnnualDebtService < 0 ? (0 as Money) : maxAnnualDebtService,
    maxMonthlyDebtService: divMoney(maxAnnualDebtService < 0 ? (0 as Money) : maxAnnualDebtService, 12),
  }
}
