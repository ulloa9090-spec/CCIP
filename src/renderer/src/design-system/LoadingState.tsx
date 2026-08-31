export function LoadingState({ label = 'Cargando...' }: { label?: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-xs text-text-muted">
      <span
        aria-hidden="true"
        className="h-3 w-3 animate-spin rounded-full border-2 border-text-muted border-t-transparent"
      />
      {label}
    </div>
  )
}
