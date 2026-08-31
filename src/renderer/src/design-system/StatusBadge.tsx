import type { ReactNode } from 'react'

export type StatusTone = 'success' | 'warning' | 'danger' | 'muted'

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  muted: 'bg-text-muted/15 text-text-muted'
}

export function StatusBadge({
  tone = 'muted',
  children
}: {
  tone?: StatusTone
  children: ReactNode
}): React.JSX.Element {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        TONE_CLASSES[tone]
      ].join(' ')}
    >
      {children}
    </span>
  )
}
