import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useProjectStore } from '../../store/projectStore'

const navSections: { label: string; items: { to: string; label: string; phase?: number }[] }[] = [
  {
    label: 'Financial Core',
    items: [
      { to: '/', label: 'Dashboard' },
      { to: '/enrollment', label: 'Enrollment' },
      { to: '/tuition', label: 'Tuition' },
      { to: '/staffing', label: 'Staffing' },
      { to: '/payroll', label: 'Payroll' },
      { to: '/expenses', label: 'Expenses' },
      { to: '/break-even', label: 'Break-Even' },
    ],
  },
  {
    label: 'Building & Financing',
    items: [
      { to: '/building-calculator', label: 'Building Calculator' },
      { to: '/properties', label: 'Properties' },
      { to: '/financing', label: 'Financing' },
    ],
  },
  {
    label: 'Planning',
    items: [
      { to: '/scenarios', label: 'Scenarios' },
      { to: '/reports', label: 'Reports' },
      { to: '/lender-view', label: 'Lender View' },
      { to: '/settings', label: 'Settings & Projects' },
    ],
  },
]

const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
  <nav className="space-y-6">
    {navSections.map((section) => (
      <div key={section.label}>
        <div className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.label}</div>
        <ul className="mt-2 space-y-1">
          {section.items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                <span>{item.label}</span>
                {item.phase && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                    Phase {item.phase}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>
)

export const AppShell = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const activeProject = useProjectStore((s) => s.activeProject)
  const isSaving = useProjectStore((s) => s.isSaving)

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950 md:flex-row">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Childcare Financial Studio</div>
          {activeProject && <div className="text-xs text-slate-500">{activeProject.name}</div>}
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen((v) => !v)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
          aria-label="Toggle navigation"
        >
          Menu
        </button>
      </header>

      {mobileNavOpen && (
        <div className="border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <NavLinks onNavigate={() => setMobileNavOpen(false)} />
        </div>
      )}

      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="mb-6 px-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Childcare Financial</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">&amp; Building Capacity Studio</div>
          {activeProject && <div className="mt-2 truncate text-xs text-slate-500">{activeProject.name}</div>}
          {activeProject && activeProject.scenarios.length > 1 && (
            <div className="mt-0.5 truncate text-[11px] text-indigo-500">
              Scenario: {activeProject.scenarios.find((s) => s.id === activeProject.activeScenarioId)?.name}
            </div>
          )}
          <div className="mt-1 text-[11px] text-slate-400">{isSaving ? 'Saving…' : 'Saved'}</div>
        </div>
        <NavLinks />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-4 md:px-8 md:py-6">
        <Outlet />
      </main>
    </div>
  )
}
