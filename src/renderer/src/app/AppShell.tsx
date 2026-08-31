import { NavLink, Outlet } from 'react-router-dom'
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './nav'

function SidebarLink({ label, path }: { label: string; path: string }): React.JSX.Element {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        [
          'flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors duration-(--duration-fast)',
          isActive
            ? 'bg-surface-elevated text-text-primary'
            : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
        ].join(' ')
      }
    >
      {label}
    </NavLink>
  )
}

/**
 * Application shell: permanent sidebar + top bar + routed content, matching
 * the three-zone layout in UX_UI.md §2. The optional right Context Pane is
 * introduced per-feature starting in later phases, not here.
 */
export function AppShell(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
      <aside
        style={{ width: 'var(--sidebar-width)' }}
        className="flex shrink-0 flex-col border-r border-border bg-surface"
      >
        <div className="flex h-(--topbar-height) items-center gap-2 px-4">
          <span className="h-6 w-6 rounded-md bg-primary" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-wide text-text-primary">STUDYOS</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.id} label={item.label} path={item.path} />
          ))}
        </nav>
        <div className="border-t border-border p-2">
          <SidebarLink label={SETTINGS_NAV_ITEM.label} path={SETTINGS_NAV_ITEM.path} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-(--topbar-height) shrink-0 items-center gap-4 border-b border-border px-6">
          <input
            type="search"
            placeholder="Buscar en tu biblioteca o preguntar al tutor..."
            disabled
            className="h-9 w-full max-w-md rounded-md border border-border bg-surface px-3 text-sm text-text-secondary placeholder:text-text-muted disabled:cursor-not-allowed"
          />
          <div className="ml-auto text-xs text-text-muted">Modo Local</div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
