import { useEffect } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BreakEvenScreen } from './components/breakeven/BreakEvenScreen'
import { ComingSoon } from './components/common/ComingSoon'
import { Dashboard } from './components/dashboard/Dashboard'
import { EnrollmentScreen } from './components/enrollment/EnrollmentScreen'
import { ExpensesScreen } from './components/expenses/ExpensesScreen'
import { AppShell } from './components/layout/AppShell'
import { PayrollScreen } from './components/payroll/PayrollScreen'
import { SettingsScreen } from './components/settings/SettingsScreen'
import { StaffingScreen } from './components/staffing/StaffingScreen'
import { TuitionScreen } from './components/tuition/TuitionScreen'
import { useProjectStore } from './store/projectStore'

function App() {
  const init = useProjectStore((s) => s.init)
  const isLoaded = useProjectStore((s) => s.isLoaded)

  useEffect(() => {
    void init()
  }, [init])

  if (!isLoaded) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading…
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/enrollment" element={<EnrollmentScreen />} />
          <Route path="/tuition" element={<TuitionScreen />} />
          <Route path="/staffing" element={<StaffingScreen />} />
          <Route path="/payroll" element={<PayrollScreen />} />
          <Route path="/expenses" element={<ExpensesScreen />} />
          <Route path="/break-even" element={<BreakEvenScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/building-calculator" element={<ComingSoon title="Building Calculator" phase={3} />} />
          <Route path="/properties" element={<ComingSoon title="Properties" phase={4} />} />
          <Route path="/financing" element={<ComingSoon title="Financing" phase={4} />} />
          <Route path="/scenarios" element={<ComingSoon title="Scenarios" phase={5} />} />
          <Route path="/reports" element={<ComingSoon title="Reports" phase={6} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
