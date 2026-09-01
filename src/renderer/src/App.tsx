import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { applyTheme } from './app/theme'
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
import { ExamsLandingPage } from './features/exams/ExamsLandingPage'
import { QuizPlayerPage } from './features/exams/QuizPlayerPage'
import { QuizResultsPage } from './features/exams/QuizResultsPage'
import { PlanLandingPage } from './features/plan/PlanLandingPage'
import { PlanDetailPage } from './features/plan/PlanDetailPage'
import { FlashcardsLandingPage } from './features/flashcards/FlashcardsLandingPage'
import { FlashcardDeckPage } from './features/flashcards/FlashcardDeckPage'
import { FlashcardReviewPage } from './features/flashcards/FlashcardReviewPage'
import { ProgressPage } from './features/progress/ProgressPage'
import { KnowledgeMapPage } from './features/knowledge-map/KnowledgeMapPage'

const IMPLEMENTED_PATHS: Record<string, React.JSX.Element> = {
  '/library': <LibraryPage />,
  '/tutor': <TutorPage />,
  '/courses': <CoursesPage />,
  '/study': <StudyLandingPage />,
  '/exams': <ExamsLandingPage />,
  '/plan': <PlanLandingPage />,
  '/flashcards': <FlashcardsLandingPage />,
  '/progress': <ProgressPage />,
  '/knowledge-map': <KnowledgeMapPage />
}

function App(): React.JSX.Element {
  useEffect(() => {
    window.studyos.settings.getTheme().then(applyTheme)
  }, [])

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
          <Route path="/exams/results/:attemptId" element={<QuizResultsPage />} />
          <Route path="/exams/:attemptId" element={<QuizPlayerPage />} />
          <Route path="/plan/:courseId" element={<PlanDetailPage />} />
          <Route path="/flashcards/:courseId/review" element={<FlashcardReviewPage />} />
          <Route path="/flashcards/:courseId" element={<FlashcardDeckPage />} />
          <Route path={SETTINGS_NAV_ITEM.path} element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
