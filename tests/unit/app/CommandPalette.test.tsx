import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { CommandPalette } from '@renderer/app/CommandPalette'

function LocationProbe(): React.JSX.Element {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderPalette(onClose = vi.fn()): { onClose: typeof onClose } {
  render(
    <MemoryRouter initialEntries={['/']}>
      <LocationProbe />
      <Routes>
        <Route path="*" element={<CommandPalette onClose={onClose} />} />
      </Routes>
    </MemoryRouter>
  )
  return { onClose }
}

beforeEach(() => {
  // @ts-expect-error partial stub — only what CommandPalette's "Importar documento" command touches
  window.studyos = { documents: { import: vi.fn() } }
})

describe('CommandPalette', () => {
  it('lists every nav destination as a command by default', () => {
    renderPalette()
    expect(screen.getByText('Ir a Flashcards')).toBeInTheDocument()
    expect(screen.getByText('Ir a Configuración')).toBeInTheDocument()
  })

  it('filters commands by the typed query', async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.type(screen.getByLabelText('Buscar comando'), 'flashcards')

    expect(screen.getByText('Ir a Flashcards')).toBeInTheDocument()
    expect(screen.queryByText('Ir a Configuración')).not.toBeInTheDocument()
  })

  it('shows a "sin resultados" message when nothing matches', async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.type(screen.getByLabelText('Buscar comando'), 'xyz-no-match')

    expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
  })

  it('clicking a nav command navigates there and closes the palette', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPalette()

    await user.click(screen.getByText('Ir a Flashcards'))

    expect(screen.getByTestId('location')).toHaveTextContent('/flashcards')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('ArrowDown + Enter runs the newly selected command', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPalette()

    const input = screen.getByLabelText('Buscar comando')
    await user.type(input, 'flashcards')
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('location')).toHaveTextContent('/flashcards')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking the backdrop closes without navigating', async () => {
    const user = userEvent.setup()
    const { onClose } = renderPalette()

    await user.click(screen.getByRole('dialog').parentElement as HTMLElement)

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it('the "Importar documento" action triggers the import IPC and navigates to the library', async () => {
    const user = userEvent.setup()
    renderPalette()

    await user.click(screen.getByText('Importar documento'))

    expect(window.studyos.documents.import).toHaveBeenCalledOnce()
    expect(screen.getByTestId('location')).toHaveTextContent('/library')
  })
})
