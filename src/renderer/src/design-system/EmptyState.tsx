import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-10 text-center">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && <p className="max-w-sm text-xs text-text-secondary">{description}</p>}
      {action}
    </div>
  )
}
