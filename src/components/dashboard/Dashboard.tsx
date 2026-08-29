import { AlertList } from '../common/AlertList'
import { Card } from '../common/Card'
import { StatTile, type StatTone } from '../common/StatTile'
import { formatMoney, formatPercent } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const Dashboard = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)

  if (!project || !calc) return null

  const { revenue, financials, alerts, breakEven } = calc
  const overallStatus = financials.ebitdaMonthly >= 0 ? (financials.ebitdaMargin >= 0.1 ? 'Healthy' : 'Marginal') : 'Loss-making'
  const statusTone: StatTone = financials.ebitdaMonthly >= 0 ? (financials.ebitdaMargin >= 0.1 ? 'good' : 'warning') : 'critical'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Childcare Financial Capacity</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{project.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile label="Licensed Capacity" value={project.licensedCapacity.toString()} />
        <StatTile label="Enrolled" value={revenue.totalEnrolled.toString()} sublabel={`${revenue.availableSpaces} spaces available`} />
        <StatTile label="Occupancy" value={formatPercent(revenue.occupancy)} tone={revenue.occupancy < 0.7 ? 'warning' : 'good'} />
        <StatTile label="Monthly Revenue" value={formatMoney(financials.totalMonthlyRevenue)} />
        <StatTile label="Annual Revenue" value={formatMoney(financials.totalAnnualRevenue)} />
        <StatTile label="Monthly Payroll" value={formatMoney(financials.totalMonthlyPayroll)} sublabel={formatPercent(financials.payrollPctOfRevenue) + ' of revenue'} />
        <StatTile label="Operating Expenses" value={formatMoney(financials.totalMonthlyOpex)} sublabel={formatPercent(financials.opexPctOfRevenue) + ' of revenue'} />
        <StatTile
          label="EBITDA"
          value={formatMoney(financials.ebitdaMonthly)}
          sublabel={`${formatPercent(financials.ebitdaMargin)} margin`}
          tone={financials.ebitdaMonthly >= 0 ? 'good' : 'critical'}
        />
        <StatTile
          label="Monthly Cash Flow"
          value={formatMoney(financials.cashFlowMonthly)}
          sublabel="Before debt/rent — added in Phase 3"
          tone={financials.cashFlowMonthly >= 0 ? 'good' : 'critical'}
        />
        <StatTile
          label="Break-Even"
          value={
            !breakEven.hasCapacity
              ? '—'
              : breakEven.breakEvenExceedsCapacity
                ? 'Exceeds capacity'
                : `${breakEven.breakEvenChildren} children`
          }
          sublabel={breakEven.hasUnknownRatios ? 'Preliminary — ratio unverified' : breakEven.hasCapacity ? formatPercent(breakEven.breakEvenOccupancy ?? 0) + ' occupancy' : undefined}
          tone={breakEven.breakEvenExceedsCapacity ? 'critical' : 'neutral'}
        />
        <StatTile label="Max Property Price" value="Phase 3" sublabel="Building Affordability engine" />
        <StatTile label="Overall Financial Status" value={overallStatus} tone={statusTone} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by Age Group">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400">
                  <th className="whitespace-nowrap pb-2 pr-2 font-medium">Group</th>
                  <th className="whitespace-nowrap pb-2 pr-2 font-medium">Enrolled/Cap.</th>
                  <th className="whitespace-nowrap pb-2 pr-2 font-medium">Occ.</th>
                  <th className="whitespace-nowrap pb-2 font-medium text-right">Revenue/mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {revenue.byGroup.map((g) => {
                  const group = project.ageGroups.find((ag) => ag.id === g.ageGroupId)
                  return (
                    <tr key={g.ageGroupId}>
                      <td className="whitespace-nowrap py-2 pr-2">{group?.name}</td>
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums">
                        {group?.enrolled}/{group?.capacity}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-2 tabular-nums">{formatPercent(g.occupancy, 0)}</td>
                      <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(g.totalMonthlyRevenue)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Alerts">
          <AlertList alerts={alerts} />
        </Card>
      </div>
    </div>
  )
}
