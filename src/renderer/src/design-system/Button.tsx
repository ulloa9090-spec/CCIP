import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:brightness-110 active:brightness-95',
  secondary: 'bg-secondary text-white hover:brightness-110 active:brightness-95',
  ghost: 'bg-transparent text-text-primary border border-border hover:bg-surface-elevated',
  danger: 'bg-danger text-white hover:brightness-110 active:brightness-95'
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-md font-medium transition-[filter,background-color] duration-(--duration-base) disabled:opacity-50 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
