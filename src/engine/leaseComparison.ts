import { monthlyPaymentForLoan, remainingBalance } from './amortization'
import type { BuildingAffordabilityResult } from './buildingAffordability'
import { addMoney, mulMoney, subMoney, zeroMoney, type Money } from './money'
import type { Project, PropertyRecord } from './types'

export interface OccupancyCostProjection {
  monthlyOccupancyCostYear1: Money
  cashRequiredUpfront: Money
  fiveYearTotalCost: Money
  tenYearTotalCost: Money
  equityCreatedAt5Years: Money
}

export interface LeaseVsPurchaseResult {
  hasComparison: boolean
  propertyPriceSource: 'SELECTED_PROPERTY' | 'MAX_PROPERTY_PRICE' | 'NONE'
  propertyPrice: Money
  purchase: OccupancyCostProjection
  lease: OccupancyCostProjection
  recommendation: 'PURCHASE' | 'LEASE' | 'INCONCLUSIVE'
}

const sumLeaseCost = (monthlyYear1: Money, escalationPct: number, years: number): Money => {
  let total = zeroMoney
  for (let year = 1; year <= years; year++) {
    total = addMoney(total, mulMoney(monthlyYear1, 12 * Math.pow(1 + escalationPct, year - 1)))
  }
  return total
}

/**
 * Compares buying vs. leasing the same building (spec §37): monthly
 * occupancy cost, upfront cash required, 5/10-year total cost, and equity
 * created. Purchase financing uses the implied loan (project cost minus
 * owner equity) at the Building Calculator's rate/term assumptions — the
 * same "implied loan" concept as Reverse Calculation — since a specific
 * negotiated purchase loan may not exist yet for a property still being
 * compared against leasing it instead.
 */
export const computeLeaseVsPurchase = (
  project: Project,
  building: BuildingAffordabilityResult,
  selectedProperty: PropertyRecord | null,
): LeaseVsPurchaseResult => {
  const propertyPriceSource = selectedProperty ? 'SELECTED_PROPERTY' : building.maxPropertyPrice > 0 ? 'MAX_PROPERTY_PRICE' : 'NONE'
  const propertyPrice =
    propertyPriceSource === 'SELECTED_PROPERTY'
      ? selectedProperty!.proposedOffer > 0
        ? selectedProperty!.proposedOffer
        : selectedProperty!.askingPrice
      : building.maxPropertyPrice

  const totalProjectCost = addMoney(propertyPrice, building.projectCost.totalNonPropertyCost)
  const impliedLoanRaw = subMoney(totalProjectCost, project.ownerEquityAvailable)
  const impliedLoan = impliedLoanRaw < 0 ? zeroMoney : impliedLoanRaw
  const cashRequiredUpfront = subMoney(totalProjectCost, impliedLoan)

  const monthlyDebtService = monthlyPaymentForLoan(impliedLoan, project.loanInterestRatePct, project.loanAmortizationYears)
  const balanceAt5Years = remainingBalance(impliedLoan, project.loanInterestRatePct, project.loanAmortizationYears, 60)

  const purchase: OccupancyCostProjection = {
    monthlyOccupancyCostYear1: monthlyDebtService,
    cashRequiredUpfront,
    fiveYearTotalCost: mulMoney(monthlyDebtService, 60),
    tenYearTotalCost: mulMoney(monthlyDebtService, 120),
    equityCreatedAt5Years: subMoney(impliedLoan, balanceAt5Years),
  }

  const { leaseTerms } = project
  const leaseMonthlyYear1 = addMoney(leaseTerms.baseRentMonthly, leaseTerms.nnnMonthly)
  const leaseCashRequired = (() => {
    const deposit = mulMoney(leaseTerms.baseRentMonthly, leaseTerms.securityDepositMonths)
    const net = subMoney(deposit, leaseTerms.tenantImprovementAllowance)
    return net < 0 ? zeroMoney : net
  })()

  const lease: OccupancyCostProjection = {
    monthlyOccupancyCostYear1: leaseMonthlyYear1,
    cashRequiredUpfront: leaseCashRequired,
    fiveYearTotalCost: sumLeaseCost(leaseMonthlyYear1, leaseTerms.annualEscalationPct, 5),
    tenYearTotalCost: sumLeaseCost(leaseMonthlyYear1, leaseTerms.annualEscalationPct, 10),
    equityCreatedAt5Years: zeroMoney,
  }

  const purchaseNetCost = subMoney(purchase.fiveYearTotalCost, purchase.equityCreatedAt5Years)
  const leaseNetCost = lease.fiveYearTotalCost
  const gapPct = leaseNetCost > 0 ? Math.abs(purchaseNetCost - leaseNetCost) / leaseNetCost : 0

  const recommendation: LeaseVsPurchaseResult['recommendation'] =
    propertyPriceSource === 'NONE' || gapPct < 0.05 ? 'INCONCLUSIVE' : purchaseNetCost < leaseNetCost ? 'PURCHASE' : 'LEASE'

  return { hasComparison: propertyPriceSource !== 'NONE', propertyPriceSource, propertyPrice, purchase, lease, recommendation }
}
