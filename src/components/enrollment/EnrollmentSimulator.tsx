import { useMemo, useState } from 'react'
import { Card } from '../common/Card'
import { computeRevenueSummary } from '../../engine/revenue'
import { formatMoney, formatPercent, subMoney } from '../../engine/money'
import { useProjectStore } from '../../store/projectStore'
import type { AgeGroup } from '../../engine/types'

const presets = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0]

/** Scales enrollment to a target occupancy %, keeping each group's current private/subsidized mix. */
const scaleGroupToOccupancy = (group: AgeGroup, occupancyPct: number): AgeGroup => {
  const enrolled = Math.min(group.capacity, Math.round(group.capacity * occupancyPct))
  if (group.enrolled === 0) {
    return { ...group, enrolled, privatePay: enrolled, subsidized: 0 }
  }
  const privateRatio = group.privatePay / group.enrolled
  const privatePay = Math.min(enrolled, Math.round(enrolled * privateRatio))
  return { ...group, enrolled, privatePay, subsidized: enrolled - privatePay }
}

export const EnrollmentSimulator = () => {
  const project = useProjectStore((s) => s.activeProject)
  const calc = useProjectStore((s) => s.calculation)
  const [selected, setSelected] = useState<number | null>(null)

  const preview = useMemo(() => {
    if (!project || selected === null) return null
    const scaled = project.ageGroups.map((g) => scaleGroupToOccupancy(g, selected))
    return computeRevenueSummary(scaled)
  }, [project, selected])

  if (!project || !calc) return null

  return (
    <Card
      title="Enrollment Simulator"
      subtitle="Preview revenue at different occupancy levels (revenue only — staffing- and payroll-adjusted simulation arrives in Phase 2)."
    >
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setSelected(p === selected ? null : p)}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              selected === p
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {Math.round(p * 100)}%
          </button>
        ))}
      </div>

      {preview && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Children</div>
            <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{preview.totalEnrolled}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Occupancy</div>
            <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatPercent(preview.occupancy)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Monthly Revenue</div>
            <div className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(preview.totalMonthlyRevenue)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">vs. Current</div>
            <div
              className={`text-lg font-semibold tabular-nums ${
                preview.totalMonthlyRevenue >= calc.revenue.totalMonthlyRevenue ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatMoney(subMoney(preview.totalMonthlyRevenue, calc.revenue.totalMonthlyRevenue))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
