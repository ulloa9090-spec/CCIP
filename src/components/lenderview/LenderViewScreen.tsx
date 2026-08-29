import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { DECISION_LABELS } from '../../engine/decisionEngine'
import { formatMoney, formatPercent, zeroMoney } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

/**
 * Bank Mode (spec §53): a read-only filtered view showing only what a
 * lender needs — no editing controls. Pulls exclusively from already-computed
 * engine outputs; never restates a number differently than the rest of the app.
 */
export const LenderViewScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)

  if (!project || !calc) return null

  const { financials, building, sourcesUses, propertyAffordability, breakEven, decision, financingStructure } = calc
  const selectedProperty = project.properties.find((p) => p.id === project.selectedPropertyId)

  return (
    <div className="space-y-6 print:space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Lender View</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {project.name}
          {selectedProperty ? ` — ${selectedProperty.address}` : ''}. Read-only; figures match every other screen in
          this app exactly.
        </p>
      </div>

      <Card title="Project Cost & Loan Request">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Property Price" value={selectedProperty ? formatMoney(propertyAffordability?.propertyPrice ?? zeroMoney) : 'Not selected'} />
          <StatTile label="Total Project Cost" value={formatMoney(propertyAffordability?.totalProjectCost ?? building.maxTotalProjectCost)} />
          <StatTile label="Loan Request" value={formatMoney(financingStructure.totalFinanced)} />
          <StatTile label="Borrower Equity" value={formatMoney(project.ownerEquityAvailable)} />
        </div>
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

      <Card title="Stabilized Financials">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Stabilized Revenue" value={formatMoney(financials.totalMonthlyRevenue)} sublabel="per month, current" />
          <StatTile label="EBITDA / NOI" value={formatMoney(financials.ebitdaMonthly)} sublabel={`${formatPercent(financials.ebitdaMargin)} margin`} />
          <StatTile label="Proposed Debt Service" value={formatMoney(financingStructure.combinedMonthlyPayment)} sublabel="per month" />
          <StatTile
            label="DSCR"
            value={propertyAffordability?.actualDSCR != null ? propertyAffordability.actualDSCR.toFixed(2) : 'N/A'}
            tone={propertyAffordability?.actualDSCR != null && propertyAffordability.actualDSCR >= project.targetDSCR ? 'good' : 'critical'}
          />
        </div>
      </Card>

      <Card title="Break-Even & Working Capital">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Break-Even Enrollment" value={breakEven.breakEvenChildren === null ? 'Exceeds capacity' : `${breakEven.breakEvenChildren} children`} />
          <StatTile label="Break-Even Occupancy" value={breakEven.breakEvenOccupancy === null ? 'N/A' : formatPercent(breakEven.breakEvenOccupancy)} />
          <StatTile label="Working Capital Reserve" value={formatMoney(building.projectCost.workingCapitalAmount)} sublabel={`${project.workingCapitalMonths} months`} />
          <StatTile label="Negotiation-Buffered Price" value={formatMoney(building.recommendedSearchPrice)} />
        </div>
      </Card>

      <Card title="Feasibility & Risks" subtitle="Deterministic classification (spec §66), not a lender's own underwriting decision.">
        <div className="mb-3 inline-block rounded-md bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
          {DECISION_LABELS[decision.rating]}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{decision.why[0]}</p>
        {decision.majorRisks.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-300">
            {decision.majorRisks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
