import { Link } from 'react-router-dom'
import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { MoneyInput, NumberField, TextField } from '../common/inputs'
import { divMoney, formatMoney, formatPercent } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const PayrollScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const addPayrollLineItem = useProjectStore((s) => s.addPayrollLineItem)
  const removePayrollLineItem = useProjectStore((s) => s.removePayrollLineItem)
  const updatePayrollLineItem = useProjectStore((s) => s.updatePayrollLineItem)

  if (!project || !calc) return null

  const { payroll, staffing, financials, revenue } = calc
  const totalHeadcount = payroll.totalHeadcount + staffing.totalPlannedClassroomStaff
  const revenuePerEmployee = divMoney(financials.totalMonthlyRevenue, totalHeadcount)
  const childrenPerEmployee = totalHeadcount > 0 ? revenue.totalEnrolled / totalHeadcount : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Payroll</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total payroll combines classroom staffing (set per age group on the{' '}
          <Link to="/staffing" className="text-indigo-600 underline dark:text-indigo-400">
            Staffing
          </Link>{' '}
          screen) with the support &amp; admin positions below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Headcount" value={totalHeadcount.toString()} sublabel={`${staffing.totalPlannedClassroomStaff} classroom + ${payroll.totalHeadcount} support/admin`} />
        <StatTile label="Total Monthly Payroll" value={formatMoney(financials.totalMonthlyPayroll)} sublabel={`${formatPercent(financials.payrollPctOfRevenue)} of revenue`} />
        <StatTile label="Revenue per Employee" value={formatMoney(revenuePerEmployee)} sublabel="per month" />
        <StatTile label="Children per Employee" value={childrenPerEmployee.toFixed(1)} />
      </div>

      <Card title="Classroom Staffing" subtitle="Read-only summary — edit headcount, cost, and ratios per age group on the Staffing screen.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400">
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">Group</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">Staff</th>
                <th className="whitespace-nowrap pb-2 font-medium text-right">Monthly Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staffing.byGroup.map((s) => {
                const group = project.ageGroups.find((g) => g.id === s.ageGroupId)
                return (
                  <tr key={s.ageGroupId}>
                    <td className="whitespace-nowrap py-2 pr-3">{group?.name}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{s.plannedStaff}</td>
                    <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(s.classroomMonthlyPayroll)}</td>
                  </tr>
                )
              })}
              {staffing.byGroup.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-slate-500 dark:text-slate-400">
                    No age groups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Support & Admin Positions"
        subtitle="Not tied to a classroom — Director, Cook, Administrative Staff, Maintenance, and similar roles."
        action={
          <button
            type="button"
            onClick={addPayrollLineItem}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Add Position
          </button>
        }
      >
        <div className="space-y-3">
          {payroll.byPosition.map((position) => {
            const item = project.payrollLineItems.find((p) => p.id === position.id)
            if (!item) return null
            return (
              <div key={item.id} className="grid grid-cols-2 items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-4 lg:grid-cols-5 dark:border-slate-800">
                <TextField label="Title" value={item.title} onChange={(title) => updatePayrollLineItem(item.id, { title })} />
                <NumberField label="Headcount" value={item.headcount} onChange={(headcount) => updatePayrollLineItem(item.id, { headcount })} />
                <MoneyInput
                  label="Fully-Loaded Cost / Employee / Month"
                  value={item.monthlyCostPerEmployee}
                  onChange={(monthlyCostPerEmployee) => updatePayrollLineItem(item.id, { monthlyCostPerEmployee })}
                />
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Position Monthly Cost</div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    {formatMoney(position.monthlyCost)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePayrollLineItem(item.id)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Remove
                </button>
              </div>
            )
          })}
          {payroll.byPosition.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No positions yet — add one to get started.</p>}
        </div>
      </Card>
    </div>
  )
}
