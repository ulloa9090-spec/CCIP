import { Card } from '../common/Card'
import { StatTile, type StatTone } from '../common/StatTile'
import { MoneyInput, TextField } from '../common/inputs'
import { formatMoney, formatPercent, zeroMoney } from '../../engine/money'
import { VERDICT_LABELS, type AffordabilityVerdict } from '../../engine/propertyAnalysis'
import { useProjectStore } from '../../store/projectStore'

const verdictTone: Record<AffordabilityVerdict, StatTone> = {
  AFFORDABLE: 'good',
  AFFORDABLE_WITH_CONDITIONS: 'warning',
  RENEGOTIATE: 'warning',
  HIGH_RISK: 'critical',
  NOT_AFFORDABLE: 'critical',
}

export const PropertiesScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const addProperty = useProjectStore((s) => s.addProperty)
  const removeProperty = useProjectStore((s) => s.removeProperty)
  const updateProperty = useProjectStore((s) => s.updateProperty)
  const selectProperty = useProjectStore((s) => s.selectProperty)

  if (!project || !calc) return null

  const { propertyAffordability, reverseCalculation, building } = calc

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Properties</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Property-First Mode (spec §35): you found a building — can this childcare afford it? Renovation, closing,
          and other project costs are shared with the Building Calculator's Project Costs, entered once.
        </p>
      </div>

      <Card
        title="Saved Properties"
        action={
          <button type="button" onClick={addProperty} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500">
            + Add Property
          </button>
        }
      >
        <div className="space-y-3">
          {project.properties.map((property) => {
            const isActive = property.id === project.selectedPropertyId
            return (
              <div
                key={property.id}
                className={`rounded-lg border p-3 ${isActive ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="w-64">
                    <TextField label="Address / Name" value={property.address} onChange={(address) => updateProperty(property.id, { address })} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectProperty(isActive ? null : property.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isActive ? 'Active for Analysis' : 'Analyze This Property'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProperty(property.id)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <MoneyInput label="Asking Price" value={property.askingPrice} onChange={(askingPrice) => updateProperty(property.id, { askingPrice })} />
                  <MoneyInput label="Proposed Offer" value={property.proposedOffer} onChange={(proposedOffer) => updateProperty(property.id, { proposedOffer })} />
                  <TextField label="Notes" value={property.notes} onChange={(notes) => updateProperty(property.id, { notes })} />
                </div>
              </div>
            )
          })}
          {project.properties.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No properties yet — add one to start Property-First analysis.</p>}
        </div>
      </Card>

      {propertyAffordability ? (
        <Card title="Affordability Verdict">
          <div
            className={`mb-4 rounded-md px-4 py-3 text-lg font-bold ${
              verdictTone[propertyAffordability.verdict] === 'good'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                : verdictTone[propertyAffordability.verdict] === 'warning'
                  ? 'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
                  : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {VERDICT_LABELS[propertyAffordability.verdict]}
            <p className="mt-1 text-sm font-normal">{propertyAffordability.reasons[0]}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Property Price" value={formatMoney(propertyAffordability.propertyPrice)} />
            <StatTile label="Total Project Cost" value={formatMoney(propertyAffordability.totalProjectCost)} />
            <StatTile
              label="Actual DSCR"
              value={propertyAffordability.actualDSCR === null ? 'N/A' : propertyAffordability.actualDSCR.toFixed(2)}
              tone={propertyAffordability.actualDSCR !== null && propertyAffordability.actualDSCR >= project.targetDSCR ? 'good' : 'critical'}
            />
            <StatTile
              label="Cash Flow After Debt"
              value={formatMoney(propertyAffordability.cashFlowAfterDebtMonthly)}
              sublabel="per month"
              tone={propertyAffordability.cashFlowAfterDebtMonthly >= 0 ? 'good' : 'critical'}
            />
            <StatTile
              label="Funding Gap"
              value={propertyAffordability.sourcesUses.gap > 0 ? formatMoney(propertyAffordability.sourcesUses.gap) : 'None'}
              tone={propertyAffordability.sourcesUses.gap > 0 ? 'critical' : 'good'}
            />
            <StatTile
              label="Equity Shortfall"
              value={propertyAffordability.equityCheck.isEquityShortfall ? formatMoney(propertyAffordability.equityCheck.equityGap) : 'None'}
              tone={propertyAffordability.equityCheck.isEquityShortfall ? 'critical' : 'good'}
            />
            <StatTile label="Max Property Price (Building Calc.)" value={formatMoney(building.maxPropertyPrice)} />
            <StatTile label="Recommended Search Price" value={formatMoney(building.recommendedSearchPrice)} />
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select "Analyze This Property" on a saved property above to see its affordability verdict, and configure
            a financing structure on the Financing screen.
          </p>
        </Card>
      )}

      {reverseCalculation.hasProperty && (
        <Card
          title="Reverse Calculation"
          subtitle="Given this property's price, how many children does this center need to keep enrolled to responsibly afford it? (spec §36)"
        >
          {!reverseCalculation.hasCapacity ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Add licensed capacity and age groups to compute this.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Implied Loan" value={formatMoney(reverseCalculation.impliedLoan ?? zeroMoney)} />
              <StatTile label="Required Annual Debt Service" value={formatMoney(reverseCalculation.requiredAnnualDebtService ?? zeroMoney)} />
              <StatTile label="Required NOI (Annual)" value={formatMoney(reverseCalculation.requiredNOIAnnual ?? zeroMoney)} />
              <StatTile label="Required Owner Equity" value={formatMoney(reverseCalculation.requiredEquity ?? zeroMoney)} />
              <StatTile
                label="Required Children"
                value={reverseCalculation.achievableWithinCapacity ? `${reverseCalculation.requiredChildren} children` : 'Exceeds capacity'}
                tone={reverseCalculation.achievableWithinCapacity ? 'neutral' : 'critical'}
              />
              <StatTile
                label="Required Occupancy"
                value={reverseCalculation.requiredOccupancy === null ? '—' : formatPercent(reverseCalculation.requiredOccupancy)}
              />
              <StatTile
                label="Required Revenue"
                value={reverseCalculation.requiredRevenueMonthly === null ? '—' : formatMoney(reverseCalculation.requiredRevenueMonthly)}
                sublabel="per month"
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
