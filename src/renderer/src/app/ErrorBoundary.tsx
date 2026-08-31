import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '../design-system'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level render error boundary. StudyOS must never show a blank window —
 * an unhandled render error still leaves the user with a way to recover
 * without losing the app (MASTER_SPEC §16, "la app debe seguir funcionando").
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[StudyOS] Unhandled render error', error, info.componentStack)
  }

  private handleReload = (): void => {
    this.setState({ error: null })
    window.location.reload()
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-8">
        <div className="max-w-md rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="text-lg font-semibold text-text-primary">Algo salió mal</h1>
          <p className="mt-2 text-sm text-text-secondary">
            StudyOS encontró un error inesperado en la interfaz. Tus datos locales no se ven
            afectados.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-background p-2 text-left text-xs text-text-muted">
            {this.state.error.message}
          </pre>
          <Button className="mt-4" onClick={this.handleReload}>
            Recargar
          </Button>
        </div>
      </div>
    )
  }
}
