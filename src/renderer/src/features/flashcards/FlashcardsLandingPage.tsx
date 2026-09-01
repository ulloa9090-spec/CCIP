import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, LoadingState, StatusBadge } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { Course } from '@shared/types/courses'
import type { DeckSummary } from '@shared/types/flashcards'

export function FlashcardsLandingPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [decks, setDecks] = useState<DeckSummary[] | null>(null)
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [generatingCourseId, setGeneratingCourseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.flashcards.listDecks().then(setDecks)
    window.studyos.courses.list().then(setCourses)
  }, [])

  async function handleGenerate(courseId: string): Promise<void> {
    setGeneratingCourseId(courseId)
    setError(null)
    try {
      await window.studyos.flashcards.generate(courseId)
      navigate(`/flashcards/${courseId}`)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
      setGeneratingCourseId(null)
    }
  }

  const coursesWithoutDeck =
    courses !== null && decks !== null
      ? courses.filter((course) => !decks.some((deck) => deck.courseId === course.id))
      : []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Flashcards</h1>
        <p className="text-sm text-text-secondary">
          Repasa tarjetas de memoria generadas a partir de tus cursos.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {(decks === null || courses === null) && <LoadingState label="Cargando decks..." />}

      {decks !== null &&
        courses !== null &&
        decks.length === 0 &&
        coursesWithoutDeck.length === 0 && (
          <EmptyState
            title="Todavía no tienes cursos"
            description="Crea un curso desde tu biblioteca para poder generar tarjetas."
            action={
              <Link to="/courses/new">
                <Button size="sm">+ Crear curso</Button>
              </Link>
            }
          />
        )}

      {decks !== null && decks.length > 0 && (
        <div className="flex flex-col gap-2">
          {decks.map((deck) => (
            <Link key={deck.courseId} to={`/flashcards/${deck.courseId}`}>
              <Card className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {deck.courseTitle}
                  </p>
                  <p className="text-xs text-text-muted">{deck.totalCards} tarjetas</p>
                </div>
                {deck.dueCards > 0 && (
                  <StatusBadge tone="warning">{deck.dueCards} para hoy</StatusBadge>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      {coursesWithoutDeck.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-text-primary">Sin tarjetas todavía</h2>
          <div className="flex flex-col gap-2">
            {coursesWithoutDeck.map((course) => (
              <Card key={course.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                  <p className="truncate text-xs text-text-muted">{course.objective}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleGenerate(course.id)}
                  disabled={generatingCourseId !== null}
                >
                  {generatingCourseId === course.id ? 'Generando...' : 'Generar con IA'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
