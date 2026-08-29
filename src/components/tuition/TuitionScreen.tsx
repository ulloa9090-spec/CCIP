import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { MoneyInput, PercentInput } from '../common/inputs'
import { formatMoney, zeroMoney } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const TuitionScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const updateAgeGroup = useProjectStore((s) => s.updateAgeGroup)

  if (!project || !calc) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tuition</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Monthly figures use weekly tuition × 52 / 12 — never × 4 — so they reflect a full 52-week billing year.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Weighted Avg. Weekly Tuition" value={formatMoney(calc.revenue.weightedAvgWeeklyTuition)} />
        <StatTile label="Revenue at Current Enrollment" value={formatMoney(calc.revenue.totalMonthlyRevenue)} sublabel="per month" />
        <StatTile label="Revenue at Full Capacity" value={formatMoney(calc.revenue.monthlyRevenueAtFullCapacity)} sublabel="per month" />
        <StatTile label="Lost Revenue (empty seats)" value={formatMoney(calc.revenue.lostMonthlyRevenue)} sublabel="per month" tone={calc.revenue.lostMonthlyRevenue > 0 ? 'warning' : 'good'} />
      </div>

      <Card title="Tuition & Fees by Age Group">
        <div className="space-y-4">
          {project.ageGroups.map((group) => {
            const gr = calc.revenue.byGroup.find((g) => g.ageGroupId === group.id)
            return (
              <div key={group.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {group.privatePay} private-pay + {group.subsidized} subsidized = {group.enrolled} enrolled
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <MoneyInput label="Weekly Tuition (private)" value={group.weeklyTuition} onChange={(weeklyTuition) => updateAgeGroup(group.id, { weeklyTuition })} />
                  <MoneyInput label="Weekly Subsidy Rate" value={group.subsidyWeeklyRate} onChange={(subsidyWeeklyRate) => updateAgeGroup(group.id, { subsidyWeeklyRate })} />
                  <MoneyInput label="Registration Fee (annual)" value={group.registrationFeeAnnual} onChange={(registrationFeeAnnual) => updateAgeGroup(group.id, { registrationFeeAnnual })} />
                  <PercentInput label="Discount (sibling/employee/other)" value={group.discountPct} onChange={(discountPct) => updateAgeGroup(group.id, { discountPct })} />
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Monthly Revenue</div>
                    <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                      {formatMoney(gr?.totalMonthlyRevenue ?? zeroMoney)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500 sm:grid-cols-4 dark:text-slate-400">
                  <div>Weekly: {formatMoney(gr?.weeklyRevenueAfterDiscount ?? zeroMoney)}</div>
                  <div>Annual: {formatMoney(gr?.totalAnnualRevenue ?? zeroMoney)}</div>
                  <div>Revenue / Child: {formatMoney(gr?.revenuePerChildMonthly ?? zeroMoney)}/mo</div>
                  <div>At Full Capacity: {formatMoney(gr?.monthlyRevenueAtFullCapacity ?? zeroMoney)}/mo</div>
                </div>
              </div>
            )
          })}
          {project.ageGroups.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Add age groups on the Enrollment screen to configure tuition.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
