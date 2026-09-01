export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger'

const TONE_CLASSES: Record<ProgressTone, string> = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
}

interface ProgressBarProps {
  /** 0-100 */
  value: number
  tone?: ProgressTone
}

export function ProgressBar({ value, tone = 'primary' }: ProgressBarProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-(--duration-base) ${TONE_CLASSES[tone]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
