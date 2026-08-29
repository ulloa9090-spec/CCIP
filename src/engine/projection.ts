import type { FinancialSummary } from './financials'
import { computeFinancingStructure } from './financing'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import type { Project } from './types'

export interface AnnualProjectionYear {
  year: number
  revenue: Money
  payroll: Money
  opex: Money
  ebitda: Money
  debtService: Money
  cashFlow: Money
  dscr: number | null
  margin: number
  endingCash: Money
}

export interface AnnualProjection {
  years: AnnualProjectionYear[]
  /** True once ending cash goes negative in any year — a real risk signal, not just a number to scan. */
  everGoesNegative: boolean
}

/**
 * Years 1-5 annual projection (spec §55), compounding the current stabilized
 * financials forward at the project's own growth assumptions. This is a
 * projection from TODAY's numbers, not a month-by-month enrollment ramp
 * (that level of detail is out of scope here — see Working Capital's quick
 * method for the ramp concept) — labeled as such in the UI, not disguised as
 * more precise than it is (spec §65).
 */
export const computeAnnualProjection = (project: Project, financials: FinancialSummary): AnnualProjection => {
  const financing = computeFinancingStructure(project.financingTranches)
  const annualDebtService = financing.combinedAnnualPayment

  const { tuitionGrowthPct, expenseInflationPct, wageGrowthPct } = project.projectionAssumptions

  let endingCash = zeroMoney
  const years: AnnualProjectionYear[] = []

  for (let year = 1; year <= 5; year++) {
    const revenue = mulMoney(financials.totalAnnualRevenue, Math.pow(1 + tuitionGrowthPct, year - 1))
    const payroll = mulMoney(financials.totalAnnualPayroll, Math.pow(1 + wageGrowthPct, year - 1))
    const opex = mulMoney(financials.totalAnnualOpex, Math.pow(1 + expenseInflationPct, year - 1))
    const ebitda = subMoney(subMoney(revenue, payroll), opex)
    const cashFlow = subMoney(ebitda, annualDebtService)
    endingCash = addMoney(endingCash, cashFlow)

    years.push({
      year,
      revenue,
      payroll,
      opex,
      ebitda,
      debtService: annualDebtService,
      cashFlow,
      dscr: annualDebtService > 0 ? ebitda / annualDebtService : null,
      margin: revenue > 0 ? ebitda / revenue : 0,
      endingCash,
    })
  }

  return { years, everGoesNegative: years.some((y) => y.endingCash < 0) }
}
