import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@renderer/app/ErrorBoundary'

function Bomb(): React.JSX.Element {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders a recovery UI instead of crashing the app', () => {
    // React logs the caught error to the console; silence it for this test.
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Todo bien</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Todo bien')).toBeInTheDocument()
  })
})
