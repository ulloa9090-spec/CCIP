import { generateId } from '../lib/id'
import { fromDollars } from '../engine/money'
import type { AgeGroup, ExpenseItem, PayrollLineItem, Project } from '../engine/types'

/**
 * Demonstration base case: a 60-child center (spec §2, §69). This is a
 * starting point only — licensedCapacity and every age group below are
 * fully editable and no formula in the engine depends on this number.
 *
 * Child:staff ratios are intentionally left unset (UNKNOWN) rather than
 * invented (spec §11) — enter your jurisdiction's verified ratios on the
 * Staffing screen. plannedStaffCount/staffMonthlyCostPerEmployee are the
 * operator's own planned classroom staffing, not a regulatory figure.
 */
const demoAgeGroups: Omit<AgeGroup, 'id'>[] = [
  {
    name: 'Infants',
    minAgeMonths: 6,
    maxAgeMonths: 18,
    order: 0,
    capacity: 8,
    enrolled: 7,
    privatePay: 5,
    subsidized: 2,
    weeklyTuition: fromDollars(340),
    subsidyWeeklyRate: fromDollars(300),
    registrationFeeAnnual: fromDollars(100),
    discountPct: 0,
    plannedStaffCount: 2,
    staffMonthlyCostPerEmployee: fromDollars(2900),
  },
  {
    name: 'Young Toddlers',
    minAgeMonths: 18,
    maxAgeMonths: 24,
    order: 1,
    capacity: 8,
    enrolled: 8,
    privatePay: 6,
    subsidized: 2,
    weeklyTuition: fromDollars(310),
    subsidyWeeklyRate: fromDollars(280),
    registrationFeeAnnual: fromDollars(100),
    discountPct: 0,
    plannedStaffCount: 2,
    staffMonthlyCostPerEmployee: fromDollars(2850),
  },
  {
    name: 'Older Toddlers',
    minAgeMonths: 24,
    maxAgeMonths: 36,
    order: 2,
    capacity: 12,
    enrolled: 10,
    privatePay: 8,
    subsidized: 2,
    weeklyTuition: fromDollars(290),
    subsidyWeeklyRate: fromDollars(260),
    registrationFeeAnnual: fromDollars(100),
    discountPct: 0,
    plannedStaffCount: 2,
    staffMonthlyCostPerEmployee: fromDollars(2800),
  },
  {
    name: 'Preschool',
    minAgeMonths: 36,
    maxAgeMonths: 48,
    order: 3,
    capacity: 16,
    enrolled: 14,
    privatePay: 11,
    subsidized: 3,
    weeklyTuition: fromDollars(260),
    subsidyWeeklyRate: fromDollars(235),
    registrationFeeAnnual: fromDollars(75),
    discountPct: 0,
    plannedStaffCount: 2,
    staffMonthlyCostPerEmployee: fromDollars(2750),
  },
  {
    name: 'Pre-K',
    minAgeMonths: 48,
    maxAgeMonths: 60,
    order: 4,
    capacity: 12,
    enrolled: 11,
    privatePay: 9,
    subsidized: 2,
    weeklyTuition: fromDollars(250),
    subsidyWeeklyRate: fromDollars(225),
    registrationFeeAnnual: fromDollars(75),
    discountPct: 0,
    plannedStaffCount: 2,
    staffMonthlyCostPerEmployee: fromDollars(2750),
  },
  {
    name: 'School Age',
    minAgeMonths: 60,
    maxAgeMonths: 144,
    order: 5,
    capacity: 4,
    enrolled: 1,
    privatePay: 1,
    subsidized: 0,
    weeklyTuition: fromDollars(150),
    subsidyWeeklyRate: fromDollars(135),
    registrationFeeAnnual: fromDollars(50),
    discountPct: 0,
    plannedStaffCount: 1,
    staffMonthlyCostPerEmployee: fromDollars(2600),
  },
]

const demoPayroll: Omit<PayrollLineItem, 'id'>[] = [
  { title: 'Director', headcount: 1, monthlyCostPerEmployee: fromDollars(5000) },
  { title: 'Assistant Director', headcount: 1, monthlyCostPerEmployee: fromDollars(3800) },
  { title: 'Cook', headcount: 1, monthlyCostPerEmployee: fromDollars(2600) },
  { title: 'Administrative Staff', headcount: 1, monthlyCostPerEmployee: fromDollars(2800) },
]

const demoExpenses: Omit<ExpenseItem, 'id'>[] = [
  { category: 'Food', label: 'Food', classification: 'PER_CHILD', monthlyAmount: 0 as never, perChildMonthlyAmount: fromDollars(85), pctOfRevenue: 0 },
  { category: 'Supplies', label: 'Classroom Supplies', classification: 'PER_CHILD', monthlyAmount: 0 as never, perChildMonthlyAmount: fromDollars(20), pctOfRevenue: 0 },
  { category: 'Utilities', label: 'Utilities (electric, gas, water)', classification: 'FIXED', monthlyAmount: fromDollars(1800), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 },
  { category: 'Insurance', label: 'Insurance', classification: 'FIXED', monthlyAmount: fromDollars(1200), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 },
  { category: 'Licensing', label: 'Licensing & Compliance', classification: 'FIXED', monthlyAmount: fromDollars(300), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 },
  { category: 'Marketing', label: 'Marketing', classification: 'PCT_REVENUE', monthlyAmount: 0 as never, perChildMonthlyAmount: 0 as never, pctOfRevenue: 0.02 },
  { category: 'Admin', label: 'Software & Admin', classification: 'FIXED', monthlyAmount: fromDollars(450), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 },
  { category: 'Maintenance', label: 'Maintenance & Repairs', classification: 'FIXED', monthlyAmount: fromDollars(600), perChildMonthlyAmount: 0 as never, pctOfRevenue: 0 },
]

export const createDefaultProject = (name = 'New Childcare Center'): Project => {
  const now = new Date().toISOString()
  return {
    id: generateId('project'),
    name,
    licensedCapacity: 60,
    ageGroups: demoAgeGroups.map((g) => ({ ...g, id: generateId('age') })),
    payrollLineItems: demoPayroll.map((p) => ({ ...p, id: generateId('pay') })),
    expenseItems: demoExpenses.map((e) => ({ ...e, id: generateId('exp') })),
    staffCoverageBufferPct: 0.15,
    // Financing assumptions (spec §22: editable assumptions, never asserted as universal requirements).
    targetDSCR: 1.25,
    targetProfitMarginPct: 0.15,
    loanInterestRatePct: 0.075,
    loanAmortizationYears: 25,
    negotiationBufferPct: 0.1,
    ownerEquityAvailable: fromDollars(150000),
    workingCapitalMonths: 3,
    // Left empty rather than invented — spec §65 (no false precision) and §44 (UNKNOWN ≠ zero).
    // Enter real renovation/FF&E/closing/professional-fee estimates on the Building Calculator.
    projectCostLineItems: [],
    createdAt: now,
    updatedAt: now,
  }
}
