import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  children: ReactNode
}

/** Base surface for every panel in the app (Dashboard cards, Study Mode focus card, modals, etc.). */
export function Card({
  elevated = false,
  className = '',
  children,
  ...rest
}: CardProps): React.JSX.Element {
  return (
    <div
      className={[
        'rounded-lg border border-border p-4',
        elevated ? 'bg-surface-elevated shadow-md' : 'bg-surface',
        className
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
