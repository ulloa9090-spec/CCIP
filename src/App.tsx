import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { BreakEvenScreen } from './components/breakeven/BreakEvenScreen'
import { BuildingCalculatorScreen } from './components/building/BuildingCalculatorScreen'
import { Dashboard } from './components/dashboard/Dashboard'
import { EnrollmentScreen } from './components/enrollment/EnrollmentScreen'
import { ExpensesScreen } from './components/expenses/ExpensesScreen'
import { FinancingScreen } from './components/financing/FinancingScreen'
import { AppShell } from './components/layout/AppShell'
import { LenderViewScreen } from './components/lenderview/LenderViewScreen'
import { PayrollScreen } from './components/payroll/PayrollScreen'
import { PropertiesScreen } from './components/properties/PropertiesScreen'
import { ReportsScreen } from './components/reports/ReportsScreen'
import { ScenariosScreen } from './components/scenarios/ScenariosScreen'
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
    <HashRouter>
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
          <Route path="/building-calculator" element={<BuildingCalculatorScreen />} />
          <Route path="/properties" element={<PropertiesScreen />} />
          <Route path="/financing" element={<FinancingScreen />} />
          <Route path="/scenarios" element={<ScenariosScreen />} />
          <Route path="/reports" element={<ReportsScreen />} />
          <Route path="/lender-view" element={<LenderViewScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
