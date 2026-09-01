import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './nav'

interface Command {
  id: string
  label: string
  run: () => void
}

interface CommandPaletteProps {
  onClose: () => void
}

/**
 * Cmd/Ctrl+K command palette (ROADMAP_IMPLEMENTATION.md Fase 12 — "keyboard
 * shortcuts" + "command palette" are the same deliverable here: this is the
 * one keyboard shortcut the app defines). Commands are just navigation
 * destinations plus two quick actions that already exist as buttons
 * elsewhere (Importar documento, Nuevo curso) — no new capability, just a
 * faster way to reach an existing one. `AppShell` only mounts this
 * component while open (rather than passing an `open` prop) so it always
 * starts from a fresh query/selection — no reset-on-open effect needed.
 * See docs/DECISIONS.md (Fase 12 ADR).
 */
export function CommandPalette({ onClose }: CommandPaletteProps): React.JSX.Element {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo<Command[]>(() => {
    const navCommands = [...NAV_ITEMS, SETTINGS_NAV_ITEM].map((item) => ({
      id: `nav:${item.id}`,
      label: `Ir a ${item.label}`,
      run: () => navigate(item.path)
    }))
    return [
      ...navCommands,
      {
        id: 'action:new-course',
        label: 'Nuevo curso',
        run: () => navigate('/courses/new')
      },
      {
        id: 'action:import-document',
        label: 'Importar documento',
        run: () => {
          window.studyos.documents.import()
          navigate('/library')
        }
      }
    ]
  }, [navigate])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (normalized.length === 0) return commands
    return commands.filter((command) => command.label.toLowerCase().includes(normalized))
  }, [commands, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleQueryChange(value: string): void {
    setQuery(value)
    setActiveIndex(0)
  }

  function runCommand(command: Command | undefined): void {
    if (!command) return
    command.run()
    onClose()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runCommand(filtered[activeIndex])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-32"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando o destino..."
          aria-label="Buscar comando"
          className="h-11 border-b border-border bg-transparent px-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-xs text-text-muted">Sin resultados.</li>
          )}
          {filtered.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                onClick={() => runCommand(command)}
                onMouseEnter={() => setActiveIndex(index)}
                className={[
                  'block w-full px-4 py-2 text-left text-sm',
                  index === activeIndex
                    ? 'bg-primary/15 text-text-primary'
                    : 'text-text-secondary hover:bg-surface'
                ].join(' ')}
              >
                {command.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-2 text-xs text-text-muted">
          ↑↓ para navegar · Enter para seleccionar · Esc para cerrar
        </div>
      </div>
    </div>
  )
}
