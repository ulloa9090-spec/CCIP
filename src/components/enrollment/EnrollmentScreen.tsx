import { Card } from '../common/Card'
import { AlertList } from '../common/AlertList'
import { NumberField, TextField } from '../common/inputs'
import { formatMoney, formatPercent, zeroMoney } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'
import { EnrollmentSimulator } from './EnrollmentSimulator'

export const EnrollmentScreen = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const setLicensedCapacity = useProjectStore((s) => s.setLicensedCapacity)
  const addAgeGroup = useProjectStore((s) => s.addAgeGroup)
  const removeAgeGroup = useProjectStore((s) => s.removeAgeGroup)
  const updateAgeGroup = useProjectStore((s) => s.updateAgeGroup)

  if (!project || !calc) return null

  const enrollmentIssues = calc.validationIssues.filter((i) => i.field.startsWith('ageGroup') || i.field === 'licensedCapacity')
  const totalGroupCapacity = project.ageGroups.reduce((sum, g) => sum + g.capacity, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Enrollment</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Licensed capacity is fully editable — nothing in the calculation engine assumes a fixed number of children.
        </p>
      </div>

      <Card title="Licensed Capacity">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <NumberField label="Licensed Capacity" value={project.licensedCapacity} onChange={setLicensedCapacity} />
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Age groups currently total <strong>{totalGroupCapacity}</strong> capacity and{' '}
            <strong>{calc.revenue.totalEnrolled}</strong> enrolled ({formatPercent(calc.revenue.occupancy)} occupancy).
          </div>
        </div>
      </Card>

      {enrollmentIssues.length > 0 && (
        <Card title="Validation">
          <AlertList
            alerts={enrollmentIssues.map((i) => ({ level: i.severity === 'WARNING' ? 'warning' : 'critical', message: i.message }))}
          />
        </Card>
      )}

      <Card
        title="Age Groups"
        subtitle="Add, remove, and configure as many groups as your center needs — Infants/Toddlers/Preschool/Pre-K/School Age are starting suggestions, not fixed categories."
        action={
          <button
            type="button"
            onClick={addAgeGroup}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Add Age Group
          </button>
        }
      >
        <div className="space-y-4">
          {project.ageGroups.map((group) => {
            const groupRevenue = calc.revenue.byGroup.find((g) => g.ageGroupId === group.id)
            const overEnrolled = group.enrolled > group.capacity
            const overSplit = group.privatePay + group.subsidized > group.enrolled
            return (
              <div key={group.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="w-56">
                    <TextField label="Name" value={group.name} onChange={(name) => updateAgeGroup(group.id, { name })} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatPercent(groupRevenue?.occupancy ?? 0)} occupancy</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {formatMoney(groupRevenue?.totalMonthlyRevenue ?? zeroMoney)}/mo
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAgeGroup(group.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <NumberField label="Min Age (mo)" value={group.minAgeMonths} onChange={(minAgeMonths) => updateAgeGroup(group.id, { minAgeMonths })} />
                  <NumberField label="Max Age (mo)" value={group.maxAgeMonths} onChange={(maxAgeMonths) => updateAgeGroup(group.id, { maxAgeMonths })} />
                  <NumberField label="Capacity" value={group.capacity} onChange={(capacity) => updateAgeGroup(group.id, { capacity })} />
                  <NumberField label="Enrolled" value={group.enrolled} onChange={(enrolled) => updateAgeGroup(group.id, { enrolled })} />
                  <NumberField label="Private Pay" value={group.privatePay} onChange={(privatePay) => updateAgeGroup(group.id, { privatePay })} />
                  <NumberField label="Subsidized" value={group.subsidized} onChange={(subsidized) => updateAgeGroup(group.id, { subsidized })} />
                </div>

                {(overEnrolled || overSplit) && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {overEnrolled && 'Enrolled exceeds capacity. '}
                    {overSplit && 'Private pay + subsidized exceeds enrolled.'}
                  </p>
                )}
              </div>
            )
          })}
          {project.ageGroups.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No age groups yet — add one to get started.</p>
          )}
        </div>
      </Card>

      <EnrollmentSimulator />
    </div>
  )
}
