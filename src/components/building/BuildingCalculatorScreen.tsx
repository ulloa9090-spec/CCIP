import { Card } from '../common/Card'
import { AlertList } from '../common/AlertList'
import { MoneyInput, NumberField, PercentInput, TextField } from '../common/inputs'
import { formatMoney, formatPercent } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const BuildingCalculatorScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const setTargetDSCR = useProjectStore((s) => s.setTargetDSCR)
  const setTargetProfitMarginPct = useProjectStore((s) => s.setTargetProfitMarginPct)
  const setLoanInterestRatePct = useProjectStore((s) => s.setLoanInterestRatePct)
  const setLoanAmortizationYears = useProjectStore((s) => s.setLoanAmortizationYears)
  const setNegotiationBufferPct = useProjectStore((s) => s.setNegotiationBufferPct)
  const setOwnerEquityAvailable = useProjectStore((s) => s.setOwnerEquityAvailable)
  const setWorkingCapitalMonths = useProjectStore((s) => s.setWorkingCapitalMonths)
  const addProjectCostLineItem = useProjectStore((s) => s.addProjectCostLineItem)
  const removeProjectCostLineItem = useProjectStore((s) => s.removeProjectCostLineItem)
  const updateProjectCostLineItem = useProjectStore((s) => s.updateProjectCostLineItem)

  if (!project || !calc) return null

  const { financials, building } = calc
  const { debtCapacity } = building

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Building Calculator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          How much building this center can responsibly afford — a consequence of its own operating economy, using
          current (not projected) EBITDA. Every rate and target below is an editable financing assumption, not a
          universal rule (spec §22).
        </p>
        {building.confidence === 'LOW' && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            PRELIMINARY RANGE / LOW CONFIDENCE — no renovation, closing, or other project costs have been entered
            below yet.
          </p>
        )}
      </div>

      <Card title="Financing Assumptions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <NumberField label="Target DSCR" value={project.targetDSCR} onChange={setTargetDSCR} />
          <PercentInput label="Target Profit Margin" value={project.targetProfitMarginPct} onChange={setTargetProfitMarginPct} />
          <PercentInput label="Loan Interest Rate" value={project.loanInterestRatePct} onChange={setLoanInterestRatePct} />
          <NumberField label="Amortization (years)" value={project.loanAmortizationYears} onChange={setLoanAmortizationYears} />
          <PercentInput label="Negotiation Buffer" value={project.negotiationBufferPct} onChange={setNegotiationBufferPct} />
          <MoneyInput label="Owner Equity Available" value={project.ownerEquityAvailable} onChange={setOwnerEquityAvailable} />
          <NumberField label="Working Capital (months)" value={project.workingCapitalMonths} onChange={setWorkingCapitalMonths} />
        </div>
      </Card>

      <Card
        title="Project Costs (non-property)"
        subtitle="Renovation, FF&E, closing costs, professional fees, licensing, startup — everything except the building itself."
        action={
          <button type="button" onClick={addProjectCostLineItem} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            + Add Cost
          </button>
        }
      >
        <div className="space-y-3">
          {project.projectCostLineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-2 items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-4 dark:border-slate-800">
              <TextField label="Category" value={item.category} onChange={(category) => updateProjectCostLineItem(item.id, { category })} />
              <TextField label="Label" value={item.label} onChange={(label) => updateProjectCostLineItem(item.id, { label })} />
              <MoneyInput label="Amount" value={item.amount} onChange={(amount) => updateProjectCostLineItem(item.id, { amount })} />
              <button
                type="button"
                onClick={() => removeProjectCostLineItem(item.id)}
                className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Remove
              </button>
            </div>
          ))}
          {project.projectCostLineItems.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No project costs entered yet — Maximum Property Price will be a low-confidence estimate until you add some.</p>
          )}
          <div className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Working Capital ({project.workingCapitalMonths} mo. × payroll+OPEX, quick method)
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(building.projectCost.workingCapitalAmount)}</span>
          </div>
        </div>
      </Card>

      <Card title="Building Calculator Waterfall">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <WaterfallRow label="Monthly Revenue (current)" value={formatMoney(financials.totalMonthlyRevenue)} />
          <WaterfallRow label="Monthly EBITDA / NOI (current)" value={formatMoney(financials.ebitdaMonthly)} />
          <WaterfallRow
            label={`Max Annual Debt Service — DSCR Method (NOI ÷ ${project.targetDSCR.toFixed(2)})`}
            value={formatMoney(debtCapacity.maxAnnualDebtServiceByDSCR)}
            emphasis={debtCapacity.bindingConstraint === 'DSCR'}
          />
          <WaterfallRow
            label={`Max Annual Debt Service — Target Margin Method (NOI − ${formatPercent(project.targetProfitMarginPct)} of revenue)`}
            value={formatMoney(debtCapacity.maxAnnualDebtServiceByMargin)}
            emphasis={debtCapacity.bindingConstraint === 'TARGET_MARGIN'}
          />
          <WaterfallRow label="Max Monthly Debt Service (binding, conservative)" value={formatMoney(debtCapacity.maxMonthlyDebtService)} bold />
          <WaterfallRow label="Maximum Sustainable Loan" value={formatMoney(building.maxSustainableLoan)} bold />
          <WaterfallRow label="+ Owner Equity Available" value={formatMoney(project.ownerEquityAvailable)} />
          <WaterfallRow label="Maximum Total Project Cost" value={formatMoney(building.maxTotalProjectCost)} bold />
          <WaterfallRow label="− Non-Property Project Costs" value={`(${formatMoney(building.projectCost.totalNonPropertyCost)})`} />
          <WaterfallRow label="MAXIMUM PROPERTY PRICE" value={formatMoney(building.maxPropertyPrice)} bold large />
          <WaterfallRow label={`− Negotiation Buffer (${formatPercent(project.negotiationBufferPct)})`} value="" />
          <WaterfallRow label="Recommended Search Price" value={formatMoney(building.recommendedSearchPrice)} bold />
        </div>

        <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm dark:border-indigo-900 dark:bg-indigo-950">
          <span className="font-semibold text-indigo-900 dark:text-indigo-300">Binding Constraint: </span>
          <span className="text-indigo-800 dark:text-indigo-300">
            {debtCapacity.bindingConstraint === 'DSCR' ? 'DSCR' : 'TARGET MARGIN'} — this is the tighter of the two
            debt-capacity methods and governs the numbers above (spec §25).
          </span>
        </div>
      </Card>

      <Card title="Alerts">
        <AlertList alerts={calc.alerts.filter((a) => a.level !== 'good')} />
      </Card>
    </div>
  )
}

const WaterfallRow = ({
  label,
  value,
  bold,
  large,
  emphasis,
}: {
  label: string
  value: string
  bold?: boolean
  large?: boolean
  emphasis?: boolean
}) => (
  <div className={`flex items-center justify-between gap-4 py-2.5 ${emphasis ? 'rounded-md bg-indigo-50 px-2 dark:bg-indigo-950' : ''}`}>
    <span className={`text-sm ${bold ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>{label}</span>
    <span
      className={`tabular-nums ${large ? 'text-lg font-bold text-indigo-700 dark:text-indigo-400' : bold ? 'text-sm font-semibold text-slate-900 dark:text-slate-100' : 'text-sm text-slate-700 dark:text-slate-300'}`}
    >
      {value}
    </span>
  </div>
)
