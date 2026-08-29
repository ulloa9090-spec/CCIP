import { monthlyPaymentForLoan } from './amortization'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import type { FinancingTranche } from './types'

export interface TrancheResult {
  trancheId: string
  monthlyPayment: Money
  annualPayment: Money
  estimatedFee: Money
}

export interface FinancingStructureResult {
  byTranche: TrancheResult[]
  totalFinanced: Money
  combinedMonthlyPayment: Money
  combinedAnnualPayment: Money
  totalEstimatedFees: Money
}

/** Combined debt service across every tranche of an actual proposed financing structure (spec §27-28). */
export const computeFinancingStructure = (tranches: FinancingTranche[]): FinancingStructureResult => {
  const byTranche = tranches.map((t) => {
    const monthlyPayment = monthlyPaymentForLoan(t.amount, t.ratePct, t.amortizationYears)
    return {
      trancheId: t.id,
      monthlyPayment,
      annualPayment: mulMoney(monthlyPayment, 12),
      estimatedFee: mulMoney(t.amount, t.feesPct),
    }
  })

  return {
    byTranche,
    totalFinanced: addMoney(zeroMoney, ...tranches.map((t) => t.amount)),
    combinedMonthlyPayment: addMoney(zeroMoney, ...byTranche.map((t) => t.monthlyPayment)),
    combinedAnnualPayment: addMoney(zeroMoney, ...byTranche.map((t) => t.annualPayment)),
    totalEstimatedFees: addMoney(zeroMoney, ...byTranche.map((t) => t.estimatedFee)),
  }
}

export interface SourcesUsesResult {
  sources: { label: string; amount: Money }[]
  uses: { label: string; amount: Money }[]
  totalSources: Money
  totalUses: Money
  gap: Money
  isBalanced: boolean
}

/** Sources = Uses, or a FUNDING GAP is reported explicitly rather than hidden (spec §54). */
export const computeSourcesAndUses = (
  ownerEquityAvailable: Money,
  tranches: FinancingTranche[],
  propertyPrice: Money | null,
  nonPropertyLineItems: { label: string; amount: Money }[],
  workingCapitalAmount: Money,
): SourcesUsesResult => {
  const sources = [
    { label: 'Owner Equity', amount: ownerEquityAvailable },
    ...tranches.map((t) => ({ label: t.label || 'Financing', amount: t.amount })),
  ]

  const uses = [
    { label: 'Property Purchase', amount: propertyPrice ?? zeroMoney },
    ...nonPropertyLineItems,
    { label: 'Working Capital', amount: workingCapitalAmount },
  ]

  const totalSources = addMoney(zeroMoney, ...sources.map((s) => s.amount))
  const totalUses = addMoney(zeroMoney, ...uses.map((u) => u.amount))
  const gap = subMoney(totalUses, totalSources)

  return { sources, uses, totalSources, totalUses, gap, isBalanced: gap === 0 }
}

export interface EquityCheckResult {
  totalProjectCost: Money
  requiredEquity: Money
  actualEquity: Money
  equityGap: Money
  isEquityShortfall: boolean
}

/** Compares available cash against the lender's required minimum equity % (spec §29). */
export const computeEquityCheck = (totalProjectCost: Money, requiredEquityPct: number, actualEquity: Money): EquityCheckResult => {
  const requiredEquity = mulMoney(totalProjectCost, requiredEquityPct)
  const equityGap = subMoney(requiredEquity, actualEquity)
  return {
    totalProjectCost,
    requiredEquity,
    actualEquity,
    equityGap: equityGap < 0 ? zeroMoney : equityGap,
    isEquityShortfall: equityGap > 0,
  }
}

export const averageWeightedRate = (tranches: FinancingTranche[]): number => {
  const total = tranches.reduce((sum, t) => sum + t.amount, 0)
  if (total === 0) return 0
  return tranches.reduce((sum, t) => sum + t.ratePct * (t.amount / total), 0)
}
