export type StatTone = 'neutral' | 'good' | 'warning' | 'critical'

const toneClasses: Record<StatTone, string> = {
  neutral: 'text-slate-900 dark:text-slate-100',
  good: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
}

export const StatTile = ({
  label,
  value,
  sublabel,
  tone = 'neutral',
}: {
  label: string
  value: string
  sublabel?: string
  tone?: StatTone
}) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
    <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClasses[tone]}`}>{value}</div>
    {sublabel && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sublabel}</div>}
  </div>
)
