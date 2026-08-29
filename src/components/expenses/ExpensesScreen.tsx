import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { MoneyInput, PercentInput, SelectField, TextField } from '../common/inputs'
import type { ExpenseClassification } from '../../engine/types'
import { formatMoney, formatPercent } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

const classificationOptions: { value: ExpenseClassification; label: string }[] = [
  { value: 'FIXED', label: 'Fixed (monthly $)' },
  { value: 'PER_CHILD', label: 'Per Child (monthly $/child)' },
  { value: 'PCT_REVENUE', label: 'Percentage of Revenue' },
]

export const ExpensesScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const addExpenseItem = useProjectStore((s) => s.addExpenseItem)
  const removeExpenseItem = useProjectStore((s) => s.removeExpenseItem)
  const updateExpenseItem = useProjectStore((s) => s.updateExpenseItem)

  if (!project || !calc) return null

  const { expenses, financials } = calc

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Operating Expenses</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Classify each expense as Fixed, Per Child, or a Percentage of Revenue — Per Child and % of Revenue expenses
          recompute automatically as enrollment and revenue change.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Monthly OPEX" value={formatMoney(financials.totalMonthlyOpex)} sublabel={`${formatPercent(financials.opexPctOfRevenue)} of revenue`} />
        <StatTile label="Annual OPEX" value={formatMoney(financials.totalAnnualOpex)} />
        <StatTile label="EBITDA" value={formatMoney(financials.ebitdaMonthly)} tone={financials.ebitdaMonthly >= 0 ? 'good' : 'critical'} />
        <StatTile label="EBITDA Margin" value={formatPercent(financials.ebitdaMargin)} tone={financials.ebitdaMargin >= 0.1 ? 'good' : financials.ebitdaMargin >= 0 ? 'warning' : 'critical'} />
      </div>

      <Card
        title="Expense Categories"
        action={
          <button
            type="button"
            onClick={addExpenseItem}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Add Expense
          </button>
        }
      >
        <div className="space-y-3">
          {expenses.byItem.map((computed) => {
            const item = project.expenseItems.find((e) => e.id === computed.id)
            if (!item) return null
            return (
              <div key={item.id} className="grid grid-cols-2 items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3 lg:grid-cols-6 dark:border-slate-800">
                <TextField label="Category" value={item.category} onChange={(category) => updateExpenseItem(item.id, { category })} />
                <TextField label="Label" value={item.label} onChange={(label) => updateExpenseItem(item.id, { label })} />
                <SelectField
                  label="Classification"
                  value={item.classification}
                  options={classificationOptions}
                  onChange={(classification) => updateExpenseItem(item.id, { classification: classification as ExpenseClassification })}
                />
                {item.classification === 'FIXED' && (
                  <MoneyInput label="Monthly Amount" value={item.monthlyAmount} onChange={(monthlyAmount) => updateExpenseItem(item.id, { monthlyAmount })} />
                )}
                {item.classification === 'PER_CHILD' && (
                  <MoneyInput
                    label="$ / Child / Month"
                    value={item.perChildMonthlyAmount}
                    onChange={(perChildMonthlyAmount) => updateExpenseItem(item.id, { perChildMonthlyAmount })}
                  />
                )}
                {item.classification === 'PCT_REVENUE' && (
                  <PercentInput label="% of Revenue" value={item.pctOfRevenue} onChange={(pctOfRevenue) => updateExpenseItem(item.id, { pctOfRevenue })} />
                )}
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Monthly Cost</div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    {formatMoney(computed.monthlyAmount)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeExpenseItem(item.id)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              </div>
            )
          })}
          {expenses.byItem.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No expenses yet — add one to get started.</p>}
        </div>
      </Card>
    </div>
  )
}
