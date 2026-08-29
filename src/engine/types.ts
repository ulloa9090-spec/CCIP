import type { Money } from './money'

/**
 * Phase 1 data model. Shapes here are the subset of the full architecture
 * (docs/ARCHITECTURE.md §2) needed for the Financial Core. Later phases add
 * fields (ratios, staffing assignments, financing, etc.) without changing
 * these — the engine graph only ever reads what each phase declares.
 */

export interface AgeGroup {
  id: string
  name: string
  minAgeMonths: number
  maxAgeMonths: number
  order: number
  capacity: number
  enrolled: number
  privatePay: number
  subsidized: number
  /** Weekly tuition charged to a private-pay family. */
  weeklyTuition: Money
  /** Weekly amount received (subsidy + any parent copay) per subsidized child. */
  subsidyWeeklyRate: Money
  /** One-time-per-year registration fee per enrolled child. */
  registrationFeeAnnual: Money
  /** Combined sibling/employee/other discount applied to gross tuition revenue, 0-1. */
  discountPct: number

  /**
   * Maximum children per staff member for this classroom, per spec §11: this
   * must never be invented. `undefined` renders as UNKNOWN / NEEDS
   * VERIFICATION in the UI rather than being treated as "no requirement."
   */
  ratioMaxChildrenPerStaff?: number
  ratioJurisdiction?: string
  ratioSource?: string
  ratioVerifiedDate?: string

  /** Actual classroom staff the operator plans to schedule for this group. */
  plannedStaffCount: number
  /** Fully-loaded monthly cost per classroom staff member in this group. */
  staffMonthlyCostPerEmployee: Money
}

export type ExpenseClassification = 'FIXED' | 'PER_CHILD' | 'PCT_REVENUE'

export interface ExpenseItem {
  id: string
  category: string
  label: string
  classification: ExpenseClassification
  /** Monthly amount, used when classification is FIXED. */
  monthlyAmount: Money
  /** Per-enrolled-child monthly amount, used when classification is PER_CHILD. */
  perChildMonthlyAmount: Money
  /** Fraction of total monthly revenue (0-1), used when classification is PCT_REVENUE. */
  pctOfRevenue: number
}

export interface PayrollLineItem {
  id: string
  title: string
  headcount: number
  monthlyCostPerEmployee: Money
}

/** A non-property project cost (renovation, FF&E, closing costs, etc.) — spec §30. */
export interface ProjectCostLineItem {
  id: string
  category: string
  label: string
  amount: Money
}

export type FinancingType = 'SBA_504' | 'SBA_7A' | 'CONVENTIONAL' | 'SELLER_FINANCING' | 'OWNER_FINANCING' | 'CUSTOM'

/**
 * One lien/tranche of an actual proposed financing structure (spec §27-28).
 * No rate, term, or fee is ever defaulted to a "current market" figure — the
 * user enters real terms from a real lender conversation.
 */
export interface FinancingTranche {
  id: string
  label: string
  amount: Money
  ratePct: number
  amortizationYears: number
  /** Estimated closing/origination fee, % of tranche amount — informational only, not amortized. */
  feesPct: number
}

/** A saved building the user is evaluating (spec §35 Property-First Mode). */
export interface PropertyRecord {
  id: string
  address: string
  askingPrice: Money
  proposedOffer: Money
  notes: string
}

export interface Project {
  id: string
  name: string
  licensedCapacity: number
  ageGroups: AgeGroup[]
  /** Support/admin positions not tied to a specific classroom (Director, Cook, etc.). */
  payrollLineItems: PayrollLineItem[]
  expenseItems: ExpenseItem[]
  /**
   * Extra classroom staffing above the regulatory minimum to cover breaks,
   * PTO, opening/closing, training, and floaters (spec §13). This is a
   * financing-style assumption, not a regulation — editable, defaulted low.
   */
  staffCoverageBufferPct: number

  /**
   * Building-affordability assumptions (spec §21-34). Every one of these is a
   * financing/underwriting assumption the user sets — none is asserted as a
   * universal requirement (spec §22: "Financing Assumption", not fact).
   */
  targetDSCR: number
  targetProfitMarginPct: number
  loanInterestRatePct: number
  loanAmortizationYears: number
  negotiationBufferPct: number
  ownerEquityAvailable: Money
  /** Quick-method working capital: months of payroll+OPEX to hold in reserve (spec §31). */
  workingCapitalMonths: number
  /** Non-property project costs: renovation, FF&E, closing, professional fees, etc. Shared by forward and Property-First modes (spec §68: enter once, use everywhere). */
  projectCostLineItems: ProjectCostLineItem[]

  /** Actual proposed financing structure for a real deal (spec §27-29), distinct from the abstract sustainable-capacity assumptions above. */
  financingType: FinancingType
  financingTranches: FinancingTranche[]
  /** Lender-required minimum equity as a % of total project cost. */
  requiredEquityPct: number

  properties: PropertyRecord[]
  selectedPropertyId: string | null

  createdAt: string
  updatedAt: string
}
