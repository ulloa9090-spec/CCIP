import { Card } from '../common/Card'
import { StatTile } from '../common/StatTile'
import { AlertList } from '../common/AlertList'
import { MoneyInput, NumberField, PercentInput, TextField } from '../common/inputs'
import { formatMoney, zeroMoney } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'

export const StaffingScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const updateAgeGroup = useProjectStore((s) => s.updateAgeGroup)
  const setStaffCoverageBufferPct = useProjectStore((s) => s.setStaffCoverageBufferPct)

  if (!project || !calc) return null

  const { staffing, staffingCliffs } = calc

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Staffing</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Child:staff ratios are never assumed — leave a ratio blank and it renders as{' '}
          <strong>UNKNOWN / NEEDS VERIFICATION</strong> instead of silently requiring zero staff. Enter your
          jurisdiction's verified ratio per age group below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Planned Classroom Staff" value={staffing.totalPlannedClassroomStaff.toString()} />
        <StatTile label="Classroom Payroll" value={formatMoney(staffing.totalClassroomMonthlyPayroll)} sublabel="per month" />
        <StatTile
          label="Groups Under Minimum"
          value={staffing.groupsUnderMinimum.length.toString()}
          tone={staffing.groupsUnderMinimum.length > 0 ? 'critical' : 'good'}
        />
        <StatTile
          label="Groups w/ Unverified Ratio"
          value={staffing.groupsWithUnknownRatio.length.toString()}
          tone={staffing.groupsWithUnknownRatio.length > 0 ? 'warning' : 'good'}
        />
      </div>

      <Card
        title="Coverage Buffer"
        subtitle="Extra staff above the regulatory minimum for breaks, PTO, opening/closing, and floaters — an editable assumption, not a regulation (spec §13)."
      >
        <div className="w-48">
          <PercentInput label="Coverage Buffer" value={project.staffCoverageBufferPct} onChange={setStaffCoverageBufferPct} />
        </div>
      </Card>

      <Card title="Staffing by Classroom (Age Group)">
        <div className="space-y-4">
          {project.ageGroups.map((group) => {
            const s = staffing.byGroup.find((g) => g.ageGroupId === group.id)
            return (
              <div key={group.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.name}</h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{group.enrolled} children enrolled</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <NumberField
                    label="Max Children / Staff"
                    value={group.ratioMaxChildrenPerStaff ?? 0}
                    onChange={(v) => updateAgeGroup(group.id, { ratioMaxChildrenPerStaff: v > 0 ? v : undefined })}
                  />
                  <TextField label="Jurisdiction" value={group.ratioJurisdiction ?? ''} onChange={(ratioJurisdiction) => updateAgeGroup(group.id, { ratioJurisdiction })} />
                  <TextField label="Source" value={group.ratioSource ?? ''} onChange={(ratioSource) => updateAgeGroup(group.id, { ratioSource })} />
                  <NumberField label="Planned Staff" value={group.plannedStaffCount} onChange={(plannedStaffCount) => updateAgeGroup(group.id, { plannedStaffCount })} />
                  <MoneyInput
                    label="Cost / Staff / Month"
                    value={group.staffMonthlyCostPerEmployee}
                    onChange={(staffMonthlyCostPerEmployee) => updateAgeGroup(group.id, { staffMonthlyCostPerEmployee })}
                  />
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">Classroom Payroll</div>
                    <div className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold tabular-nums text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                      {formatMoney(s?.classroomMonthlyPayroll ?? zeroMoney)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>
                    Regulatory Min:{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {s?.ratioStatus === 'UNKNOWN' ? 'UNKNOWN / NEEDS VERIFICATION' : s?.regulatoryMinStaff}
                    </strong>
                  </span>
                  <span>
                    Operational Recommended:{' '}
                    <strong className="text-slate-900 dark:text-slate-100">{s?.operationalRecommendedStaff ?? '—'}</strong>
                  </span>
                  <span>
                    Planned: <strong className="text-slate-900 dark:text-slate-100">{s?.plannedStaff}</strong>
                  </span>
                </div>

                {s?.isUnderMinimum && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    Planned staff is below the regulatory minimum for this group's ratio.
                  </p>
                )}
              </div>
            )
          })}
          {project.ageGroups.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Add age groups on the Enrollment screen first.</p>}
        </div>
      </Card>

      <Card title="Staffing Cliffs" subtitle="Every enrollment point where one more child requires one more staff member, for groups with a verified ratio (spec §12).">
        {staffingCliffs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No staffing cliffs to show yet — set a verified child:staff ratio on at least one age group above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-400">
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium">Group</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium">At Child #</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium">Staff</th>
                  <th className="whitespace-nowrap pb-2 pr-3 font-medium text-right">+Payroll/mo</th>
                  <th className="whitespace-nowrap pb-2 font-medium text-right">Net Impact/mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffingCliffs.map((cliff, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap py-2 pr-3">{cliff.ageGroupName}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{cliff.atChildCount}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums">
                      {cliff.staffBefore} → {cliff.staffAfter}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-red-600 dark:text-red-400">
                      +{formatMoney(cliff.additionalMonthlyPayroll)}
                    </td>
                    <td
                      className={`whitespace-nowrap py-2 text-right tabular-nums ${
                        cliff.netMonthlyImpact >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatMoney(cliff.netMonthlyImpact)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Alerts">
        <AlertList alerts={calc.alerts.filter((a) => a.level !== 'good')} />
      </Card>
    </div>
  )
}
