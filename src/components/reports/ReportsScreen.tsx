import { Link } from 'react-router-dom'
import { Card } from '../common/Card'
import { StatTile, type StatTone } from '../common/StatTile'
import { MoneyInput, NumberField, PercentInput } from '../common/inputs'
import { DECISION_LABELS, type DecisionRating } from '../../engine/decisionEngine'
import { formatMoney, formatPercent } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

const ratingTone: Record<DecisionRating, StatTone> = {
  STRONG: 'good',
  VIABLE: 'good',
  CONDITIONAL: 'warning',
  HIGH_RISK: 'critical',
  NOT_VIABLE: 'critical',
}

export const ReportsScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const updateProjectionAssumptions = useProjectStore((s) => s.updateProjectionAssumptions)
  const updateLeaseTerms = useProjectStore((s) => s.updateLeaseTerms)

  if (!project || !calc) return null

  const { decision, annualProjection, leaseVsPurchase, financials, building, sourcesUses, breakEven } = calc

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Executive Summary, Feasibility Decision, 5-Year Projection, Purchase vs. Lease, and Sources &amp; Uses — for{' '}
          <Link to="/lender-view" className="text-indigo-600 underline dark:text-indigo-400">
            Lender View
          </Link>{' '}
          see the bank-focused screen.
        </p>
      </div>

      <Card title="Executive Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Monthly Revenue" value={formatMoney(financials.totalMonthlyRevenue)} />
          <StatTile label="EBITDA" value={formatMoney(financials.ebitdaMonthly)} sublabel={`${formatPercent(financials.ebitdaMargin)} margin`} tone={financials.ebitdaMonthly >= 0 ? 'good' : 'critical'} />
          <StatTile label="Break-Even" value={breakEven.breakEvenChildren === null ? 'Exceeds capacity' : `${breakEven.breakEvenChildren} children`} />
          <StatTile label="Max Property Price" value={formatMoney(building.maxPropertyPrice)} />
        </div>
      </Card>

      <Card title="Feasibility Decision" subtitle="Deterministic classification (spec §66) — a rule chain over the numbers above, never a model guess.">
        <div
          className={`mb-4 rounded-md px-4 py-3 text-lg font-bold ${
            ratingTone[decision.rating] === 'good'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
              : ratingTone[decision.rating] === 'warning'
                ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
                : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
          }`}
        >
          {DECISION_LABELS[decision.rating]}
          <p className="mt-1 text-sm font-normal">{decision.why[0]}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Binding Constraint</dt>
            <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">{decision.bindingConstraint}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Major Risks</dt>
            <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {decision.majorRisks.length === 0 ? 'None identified.' : <ul className="list-disc space-y-1 pl-4">{decision.majorRisks.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Missing Information</dt>
            <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {decision.missingInformation.length === 0 ? 'None.' : <ul className="list-disc space-y-1 pl-4">{decision.missingInformation.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Actions That Improve the Deal</dt>
            <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              {decision.actionsThatImprove.length === 0 ? 'No specific actions flagged.' : <ul className="list-disc space-y-1 pl-4">{decision.actionsThatImprove.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="5-Year Annual Projection" subtitle="Compounds today's stabilized financials forward at the growth assumptions below — not a month-by-month enrollment ramp.">
        <div className="mb-4 grid grid-cols-3 gap-3">
          <PercentInput label="Tuition Growth / yr" value={project.projectionAssumptions.tuitionGrowthPct} onChange={(tuitionGrowthPct) => updateProjectionAssumptions({ tuitionGrowthPct })} />
          <PercentInput label="Expense Inflation / yr" value={project.projectionAssumptions.expenseInflationPct} onChange={(expenseInflationPct) => updateProjectionAssumptions({ expenseInflationPct })} />
          <PercentInput label="Wage Growth / yr" value={project.projectionAssumptions.wageGrowthPct} onChange={(wageGrowthPct) => updateProjectionAssumptions({ wageGrowthPct })} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400">
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">Year</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Revenue</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Payroll</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">OPEX</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">EBITDA</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Debt Service</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Cash Flow</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">DSCR</th>
                <th className="whitespace-nowrap pb-2 font-medium text-right">Ending Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {annualProjection.years.map((y) => (
                <tr key={y.year}>
                  <td className="whitespace-nowrap py-2 pr-3">Year {y.year}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(y.revenue)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(y.payroll)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(y.opex)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(y.ebitda)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(y.debtService)}</td>
                  <td className={`whitespace-nowrap py-2 pr-3 text-right tabular-nums ${y.cashFlow >= 0 ? '' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(y.cashFlow)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{y.dscr === null ? 'N/A' : y.dscr.toFixed(2)}</td>
                  <td className={`whitespace-nowrap py-2 text-right tabular-nums font-medium ${y.endingCash >= 0 ? '' : 'text-red-600 dark:text-red-400'}`}>{formatMoney(y.endingCash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {annualProjection.everGoesNegative && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Ending cash goes negative within the 5-year window at these assumptions.
          </p>
        )}
      </Card>

      <Card title="Purchase vs. Lease" subtitle="Compares the selected property's implied purchase financing against these lease terms (spec §37).">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MoneyInput label="Base Rent / mo" value={project.leaseTerms.baseRentMonthly} onChange={(baseRentMonthly) => updateLeaseTerms({ baseRentMonthly })} />
          <MoneyInput label="NNN / mo" value={project.leaseTerms.nnnMonthly} onChange={(nnnMonthly) => updateLeaseTerms({ nnnMonthly })} />
          <PercentInput label="Annual Escalation" value={project.leaseTerms.annualEscalationPct} onChange={(annualEscalationPct) => updateLeaseTerms({ annualEscalationPct })} />
          <NumberField label="Term (years)" value={project.leaseTerms.termYears} onChange={(termYears) => updateLeaseTerms({ termYears })} />
          <NumberField label="Security Deposit (months)" value={project.leaseTerms.securityDepositMonths} onChange={(securityDepositMonths) => updateLeaseTerms({ securityDepositMonths })} />
          <MoneyInput label="Tenant Improvement Allowance" value={project.leaseTerms.tenantImprovementAllowance} onChange={(tenantImprovementAllowance) => updateLeaseTerms({ tenantImprovementAllowance })} />
        </div>

        {!leaseVsPurchase.hasComparison ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Select a property or establish a Maximum Property Price on the Building Calculator to compare.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400">
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium"></th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Purchase</th>
                  <th className="whitespace-nowrap pb-2 font-medium text-right">Lease</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="whitespace-nowrap py-2 pr-3">Monthly Occupancy Cost (Yr 1)</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(leaseVsPurchase.purchase.monthlyOccupancyCostYear1)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(leaseVsPurchase.lease.monthlyOccupancyCostYear1)}</td>
                </tr>
                <tr>
                  <td className="whitespace-nowrap py-2 pr-3">Cash Required Upfront</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(leaseVsPurchase.purchase.cashRequiredUpfront)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(leaseVsPurchase.lease.cashRequiredUpfront)}</td>
                </tr>
                <tr>
                  <td className="whitespace-nowrap py-2 pr-3">5-Year Total Cost</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(leaseVsPurchase.purchase.fiveYearTotalCost)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(leaseVsPurchase.lease.fiveYearTotalCost)}</td>
                </tr>
                <tr>
                  <td className="whitespace-nowrap py-2 pr-3">10-Year Total Cost</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(leaseVsPurchase.purchase.tenYearTotalCost)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(leaseVsPurchase.lease.tenYearTotalCost)}</td>
                </tr>
                <tr className="font-medium">
                  <td className="whitespace-nowrap py-2 pr-3">Equity Created at 5 Years</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(leaseVsPurchase.purchase.equityCreatedAt5Years)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(leaseVsPurchase.lease.equityCreatedAt5Years)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              {leaseVsPurchase.recommendation === 'INCONCLUSIVE'
                ? 'Roughly a wash over 5 years — the decision likely turns on cash available and risk tolerance, not cost alone.'
                : `${leaseVsPurchase.recommendation === 'PURCHASE' ? 'Purchase' : 'Lease'} is the lower 5-year net cost at these terms.`}
            </div>
          </div>
        )}
      </Card>

      <Card title="Sources & Uses">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Sources</h3>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {sourcesUses.sources.map((s, i) => (
                <li key={i} className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatMoney(s.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Uses</h3>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {sourcesUses.uses.map((u, i) => (
                <li key={i} className="flex justify-between py-1.5">
                  <span className="text-slate-600 dark:text-slate-400">{u.label}</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-slate-100">{formatMoney(u.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className={`mt-4 rounded-md px-4 py-3 text-sm font-semibold ${
            sourcesUses.isBalanced
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
              : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
          }`}
        >
          {sourcesUses.isBalanced ? 'Sources = Uses' : `FUNDING GAP: ${formatMoney(sourcesUses.gap)}`}
        </div>
      </Card>
    </div>
  )
}
