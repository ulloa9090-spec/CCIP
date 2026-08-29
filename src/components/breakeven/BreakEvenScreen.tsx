import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { MARGIN_TIERS } from '../../engine/breakEven'
import { formatMoney, formatPercent, zeroMoney } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const BreakEvenScreen = () => {
  const calc = useProjectStore((s) => s.calculation)
  const project = useProjectStore((s) => s.activeProject)

  if (!calc || !project) return null

  const { breakEven, classroomEconomics } = calc

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Break-Even</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Simulated child-by-child across your current age-group mix — not a single linear formula — because
          ratio-driven staffing cliffs make cost non-linear in enrollment (spec §19).
        </p>
        {breakEven.hasUnknownRatios && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            PRELIMINARY — one or more age groups have an unverified child:staff ratio, so staffing cost for those
            groups is extrapolated from planned staffing rather than a verified ratio.
          </p>
        )}
      </div>

      {!breakEven.hasCapacity ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">Add licensed capacity and age groups to compute break-even.</p>
        </Card>
      ) : breakEven.breakEvenExceedsCapacity ? (
        <Card>
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            Break-even enrollment exceeds licensed capacity at the current cost structure. This center cannot break
            even as currently configured — reduce costs, raise tuition, or add capacity.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Break-Even" value={`${breakEven.breakEvenChildren} children`} />
          <StatTile label="Break-Even Occupancy" value={formatPercent(breakEven.breakEvenOccupancy ?? 0)} tone={(breakEven.breakEvenOccupancy ?? 0) >= 0.85 ? 'warning' : 'good'} />
          <StatTile label="Revenue Required" value={formatMoney(breakEven.revenueRequired ?? zeroMoney)} sublabel="per month" />
          <StatTile label="Licensed Capacity" value={project.licensedCapacity.toString()} />
        </div>
      )}

      <Card title="Children Required for Target Margin">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400">
                <th className="pb-2 pr-4 font-medium">Target Margin</th>
                <th className="pb-2 font-medium">Children Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MARGIN_TIERS.map((tier) => (
                <tr key={tier}>
                  <td className="py-2 pr-4">{formatPercent(tier, 0)}</td>
                  <td className="py-2 tabular-nums">
                    {breakEven.marginTierChildren[tier] === null || breakEven.marginTierChildren[tier] === undefined
                      ? 'Not reachable within capacity'
                      : `${breakEven.marginTierChildren[tier]} children`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Classroom Economics" subtitle="Revenue, direct payroll, and direct (variable) expenses by age group — fixed center-wide overhead is excluded (spec §20).">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400">
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">Group</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium">Children</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Revenue</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Direct Payroll</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Direct Expenses</th>
                <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">Contribution</th>
                <th className="whitespace-nowrap pb-2 font-medium text-right">Contribution/Child</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {classroomEconomics.map((ce) => {
                const group = project.ageGroups.find((g) => g.id === ce.ageGroupId)
                return (
                  <tr key={ce.ageGroupId}>
                    <td className="whitespace-nowrap py-2 pr-3">{group?.name}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{ce.children}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(ce.revenue)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(ce.directPayroll)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums">{formatMoney(ce.directExpenses)}</td>
                    <td
                      className={`whitespace-nowrap py-2 pr-3 text-right tabular-nums font-medium ${
                        ce.contributionMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatMoney(ce.contributionMargin)}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right tabular-nums">{formatMoney(ce.contributionPerChild)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
