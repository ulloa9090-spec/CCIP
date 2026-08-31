import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { PlaceholderPage } from './app/PlaceholderPage'
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './app/nav'
import { SettingsPage } from './features/settings/SettingsPage'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          {NAV_ITEMS.map((item) => (
            <Route
              key={item.id}
              path={item.path}
              element={<PlaceholderPage title={item.label} />}
            />
          ))}
          <Route path={SETTINGS_NAV_ITEM.path} element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
