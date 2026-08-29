import type { Alert } from '../../engine/alerts'

const styles: Record<Alert['level'], string> = {
  critical: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  good: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
}

const icons: Record<Alert['level'], string> = { critical: '⚠', warning: '⚠', good: '✓' }

export const AlertList = ({ alerts }: { alerts: Alert[] }) => {
  if (alerts.length === 0) return null
  return (
    <ul className="space-y-2">
      {alerts.map((alert, i) => (
        <li key={i} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles[alert.level]}`}>
          <span aria-hidden>{icons[alert.level]}</span>
          <span>{alert.message}</span>
        </li>
      ))}
    </ul>
  )
}
