import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { AlertList } from '../common/AlertList'
import { MoneyInput, NumberField, PercentInput, SelectField, TextField } from '../common/inputs'
import { formatMoney } from '../../engine/money'
import type { FinancingType } from '../../engine/types'
import { useProjectStore } from '../../store/projectStore'

const financingTypeOptions: { value: FinancingType; label: string }[] = [
  { value: 'SBA_504', label: 'SBA 504' },
  { value: 'SBA_7A', label: 'SBA 7(a)' },
  { value: 'CONVENTIONAL', label: 'Conventional Commercial Loan' },
  { value: 'SELLER_FINANCING', label: 'Seller Financing' },
  { value: 'OWNER_FINANCING', label: 'Owner Financing' },
  { value: 'CUSTOM', label: 'Custom' },
]

export const FinancingScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const setFinancingType = useProjectStore((s) => s.setFinancingType)
  const setRequiredEquityPct = useProjectStore((s) => s.setRequiredEquityPct)
  const setOwnerEquityAvailable = useProjectStore((s) => s.setOwnerEquityAvailable)
  const addFinancingTranche = useProjectStore((s) => s.addFinancingTranche)
  const removeFinancingTranche = useProjectStore((s) => s.removeFinancingTranche)
  const updateFinancingTranche = useProjectStore((s) => s.updateFinancingTranche)

  if (!project || !calc) return null

  const { financingStructure, sourcesUses, propertyAffordability, building } = calc
  const selectedProperty = project.properties.find((p) => p.id === project.selectedPropertyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Financing</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The actual proposed financing structure for a real deal — as many tranches as you need, with your own
          negotiated terms. No current market rate is assumed anywhere (spec §27).
        </p>
      </div>

      <Card title="Financing Type">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SelectField label="Type" value={project.financingType} options={financingTypeOptions} onChange={(v) => setFinancingType(v as FinancingType)} />
          <PercentInput label="Lender-Required Equity %" value={project.requiredEquityPct} onChange={setRequiredEquityPct} />
          <MoneyInput label="Owner Equity Available" value={project.ownerEquityAvailable} onChange={setOwnerEquityAvailable} />
        </div>
      </Card>

      <Card
        title="Financing Tranches"
        subtitle="SBA 504 typically has two tranches (bank first lien + CDC/SBA second lien); other types typically use one."
        action={
          <button type="button" onClick={addFinancingTranche} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            + Add Tranche
          </button>
        }
      >
        <div className="space-y-3">
          {financingStructure.byTranche.map((computed) => {
            const tranche = project.financingTranches.find((t) => t.id === computed.trancheId)
            if (!tranche) return null
            return (
              <div key={tranche.id} className="grid grid-cols-2 items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-800">
                <TextField label="Label" value={tranche.label} onChange={(label) => updateFinancingTranche(tranche.id, { label })} />
                <MoneyInput label="Amount" value={tranche.amount} onChange={(amount) => updateFinancingTranche(tranche.id, { amount })} />
                <PercentInput label="Rate" value={tranche.ratePct} onChange={(ratePct) => updateFinancingTranche(tranche.id, { ratePct })} />
                <NumberField label="Amortization (yrs)" value={tranche.amortizationYears} onChange={(amortizationYears) => updateFinancingTranche(tranche.id, { amortizationYears })} />
                <PercentInput label="Est. Fees" value={tranche.feesPct} onChange={(feesPct) => updateFinancingTranche(tranche.id, { feesPct })} />
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Monthly Payment</div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    {formatMoney(computed.monthlyPayment)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFinancingTranche(tranche.id)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              </div>
            )
          })}
          {financingStructure.byTranche.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No tranches yet — add one to model a real financing structure.</p>}
        </div>

        {financingStructure.byTranche.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total Financed" value={formatMoney(financingStructure.totalFinanced)} />
            <StatTile label="Combined Monthly Payment" value={formatMoney(financingStructure.combinedMonthlyPayment)} />
            <StatTile label="Combined Annual Payment" value={formatMoney(financingStructure.combinedAnnualPayment)} />
            <StatTile label="Estimated Fees" value={formatMoney(financingStructure.totalEstimatedFees)} sublabel="informational only" />
          </div>
        )}
      </Card>

      <Card title="Sources & Uses" subtitle={selectedProperty ? `Uses include the active property: ${selectedProperty.address}` : 'Select a property on the Properties screen to include its price in Uses.'}>
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
              <li className="flex justify-between border-t border-slate-200 py-1.5 font-semibold dark:border-slate-700">
                <span>Total Sources</span>
                <span className="tabular-nums">{formatMoney(sourcesUses.totalSources)}</span>
              </li>
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
              <li className="flex justify-between border-t border-slate-200 py-1.5 font-semibold dark:border-slate-700">
                <span>Total Uses</span>
                <span className="tabular-nums">{formatMoney(sourcesUses.totalUses)}</span>
              </li>
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

      {propertyAffordability && (
        <Card title="Debt Capacity Check">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Proposed Annual Debt Service" value={formatMoney(propertyAffordability.actualAnnualDebtService)} />
            <StatTile label="Sustainable Annual Debt Service" value={formatMoney(building.debtCapacity.maxAnnualDebtService)} />
            <StatTile
              label="Actual DSCR"
              value={propertyAffordability.actualDSCR === null ? 'N/A' : propertyAffordability.actualDSCR.toFixed(2)}
              tone={propertyAffordability.actualDSCR !== null && propertyAffordability.actualDSCR >= project.targetDSCR ? 'good' : 'critical'}
            />
            <StatTile label="Target DSCR" value={project.targetDSCR.toFixed(2)} sublabel="Financing assumption" />
          </div>
        </Card>
      )}

      <Card title="Alerts">
        <AlertList alerts={calc.alerts.filter((a) => a.level !== 'good')} />
      </Card>
    </div>
  )
}
