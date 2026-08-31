import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { PlaceholderPage } from './app/PlaceholderPage'
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './app/nav'
import { SettingsPage } from './features/settings/SettingsPage'
import { LibraryPage } from './features/library/LibraryPage'
import { DocumentDetailPage } from './features/library/DocumentDetailPage'
import { TutorPage } from './features/tutor/TutorPage'
import { CoursesPage } from './features/courses/CoursesPage'
import { CreateCoursePage } from './features/courses/CreateCoursePage'
import { CourseDetailPage } from './features/courses/CourseDetailPage'
import { StudyLandingPage } from './features/study/StudyLandingPage'
import { StudySessionPage } from './features/study/StudySessionPage'

const IMPLEMENTED_PATHS: Record<string, React.JSX.Element> = {
  '/library': <LibraryPage />,
  '/tutor': <TutorPage />,
  '/courses': <CoursesPage />,
  '/study': <StudyLandingPage />
}

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          {NAV_ITEMS.map((item) => (
            <Route
              key={item.id}
              path={item.path}
              element={IMPLEMENTED_PATHS[item.path] ?? <PlaceholderPage title={item.label} />}
            />
          ))}
          <Route path="/library/:id" element={<DocumentDetailPage />} />
          <Route path="/courses/new" element={<CreateCoursePage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/study/:courseId" element={<StudySessionPage />} />
          <Route path={SETTINGS_NAV_ITEM.path} element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
