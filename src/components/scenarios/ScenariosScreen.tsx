import { useMemo, useState } from 'react'
import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { MoneyInput, NumberField, SignedPercentInput, TextField } from '../common/inputs'
import { computeSensitivityAnalysis } from '../../engine/sensitivity'
import { computeWhatIfPreview, defaultWhatIfInputs, type WhatIfInputs } from '../../engine/whatIf'
import { formatMoney, type Money } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const ScenariosScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const createScenario = useProjectStore((s) => s.createScenario)
  const duplicateScenario = useProjectStore((s) => s.duplicateScenario)
  const selectScenario = useProjectStore((s) => s.selectScenario)
  const renameScenario = useProjectStore((s) => s.renameScenario)
  const deleteScenario = useProjectStore((s) => s.deleteScenario)

  const [newScenarioName, setNewScenarioName] = useState('')
  const [whatIf, setWhatIf] = useState<WhatIfInputs>(defaultWhatIfInputs)

  const sensitivity = useMemo(() => (project ? computeSensitivityAnalysis(project) : null), [project])
  const whatIfPreview = useMemo(() => (project ? computeWhatIfPreview(project, whatIf) : null), [project, whatIf])

  if (!project || !calc) return null

  const isWhatIfDefault = JSON.stringify(whatIf) === JSON.stringify(defaultWhatIfInputs)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Scenarios</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Save Conservative / Base / Optimistic / Custom variants (spec §38), run the fixed sensitivity presets (spec
          §39), or sandbox a freeform what-if combination (spec §56) without committing it.
        </p>
      </div>

      <Card
        title="Scenario Manager"
        action={
          <div className="flex gap-2">
            <div className="w-40">
              <TextField label="" value={newScenarioName} onChange={setNewScenarioName} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newScenarioName.trim()) return
                createScenario(newScenarioName.trim())
                setNewScenarioName('')
              }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              + New Scenario
            </button>
          </div>
        }
      >
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {project.scenarios.map((scenario) => {
            const isActive = scenario.id === project.activeScenarioId
            return (
              <li key={scenario.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${isActive ? 'rounded-md bg-indigo-50 px-2 dark:bg-indigo-950' : ''}`}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <TextField label="" value={scenario.name} onChange={(name) => renameScenario(scenario.id, name)} />
                  {isActive && <span className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">Active</span>}
                </div>
                <div className="flex gap-2">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => selectScenario(scenario.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Switch To
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => duplicateScenario(scenario.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Duplicate
                  </button>
                  {project.scenarios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete scenario "${scenario.name}"?`)) deleteScenario(scenario.id)
                      }}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Switching scenarios swaps enrollment, tuition, staffing, expenses, project costs, and financing assumptions
          across every screen. Properties are shared across scenarios.
        </p>
      </Card>

      <Card
        title="What-If Sandbox"
        subtitle="Freeform preview only — nothing here is saved until you edit the real fields on Enrollment, Tuition, Payroll, or Building Calculator."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField label="Δ Children Enrolled" value={whatIf.deltaChildren} min={-999} onChange={(deltaChildren) => setWhatIf((w) => ({ ...w, deltaChildren }))} />
          <MoneyInput label="Δ Weekly Tuition" value={whatIf.deltaWeeklyTuition} onChange={(deltaWeeklyTuition) => setWhatIf((w) => ({ ...w, deltaWeeklyTuition }))} />
          <SignedPercentInput label="Δ Wages" value={whatIf.wagesDeltaPct} onChange={(wagesDeltaPct) => setWhatIf((w) => ({ ...w, wagesDeltaPct }))} />
          <SignedPercentInput label="Δ Interest Rate" value={whatIf.interestRateDeltaPct} onChange={(interestRateDeltaPct) => setWhatIf((w) => ({ ...w, interestRateDeltaPct }))} />
        </div>

        {!isWhatIfDefault && (
          <button type="button" onClick={() => setWhatIf(defaultWhatIfInputs)} className="mt-3 text-xs font-medium text-indigo-600 underline dark:text-indigo-400">
            Reset to current values
          </button>
        )}

        {whatIfPreview && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Monthly Revenue"
              value={formatMoney(whatIfPreview.financials.totalMonthlyRevenue)}
              sublabel={diffLabel(whatIfPreview.financials.totalMonthlyRevenue - calc.financials.totalMonthlyRevenue)}
            />
            <StatTile
              label="EBITDA"
              value={formatMoney(whatIfPreview.financials.ebitdaMonthly)}
              sublabel={diffLabel(whatIfPreview.financials.ebitdaMonthly - calc.financials.ebitdaMonthly)}
              tone={whatIfPreview.financials.ebitdaMonthly >= 0 ? 'good' : 'critical'}
            />
            <StatTile
              label="Break-Even"
              value={whatIfPreview.breakEven.breakEvenChildren === null ? 'Exceeds capacity' : `${whatIfPreview.breakEven.breakEvenChildren} children`}
            />
            <StatTile label="Max Property Price" value={formatMoney(whatIfPreview.building.maxPropertyPrice)} />
          </div>
        )}
      </Card>

      {sensitivity && (
        <Card title="Sensitivity Analysis" subtitle="Fixed presets (spec §39), each a full deterministic re-run against the active scenario.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400">
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium">Scenario</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">EBITDA</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Δ EBITDA</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Break-Even</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Max Loan</th>
                  <th className="whitespace-nowrap pb-2 font-medium text-right">Max Property Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="font-medium">
                  <td className="whitespace-nowrap py-2 pr-3">Baseline (current)</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(sensitivity.baseline.ebitdaMonthly)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-slate-400">—</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{sensitivity.baseline.breakEvenChildren ?? 'N/A'}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(sensitivity.baseline.maxSustainableLoan)}</td>
                  <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(sensitivity.baseline.maxPropertyPrice)}</td>
                </tr>
                {sensitivity.runs.map((run) => (
                  <tr key={run.label}>
                    <td className="whitespace-nowrap py-2 pr-3">
                      {run.label}
                      {!run.applicable && <span className="ml-2 text-xs text-slate-400">(n/a)</span>}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{run.applicable ? formatMoney(run.metrics.ebitdaMonthly) : '—'}</td>
                    <td
                      className={`whitespace-nowrap py-2 pr-3 text-right tabular-nums ${
                        !run.applicable ? 'text-slate-400' : run.delta.ebitdaMonthly >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {run.applicable ? diffLabel(run.delta.ebitdaMonthly) : 'no matching cost line item'}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{run.applicable ? (run.metrics.breakEvenChildren ?? 'N/A') : '—'}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{run.applicable ? formatMoney(run.metrics.maxSustainableLoan) : '—'}</td>
                    <td className="whitespace-nowrap py-2 text-right tabular-nums">{run.applicable ? formatMoney(run.metrics.maxPropertyPrice) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

const diffLabel = (delta: number): string => {
  if (delta === 0) return '±$0.00'
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${formatMoney(Math.abs(delta) as Money)}`
}
