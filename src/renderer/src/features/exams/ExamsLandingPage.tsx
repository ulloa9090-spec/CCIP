import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, LoadingState, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { Course } from '@shared/types/courses'
import type { AssessmentHistoryEntry } from '@shared/types/assessment'

function scoreTone(score: number): StatusTone {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

export function ExamsLandingPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [history, setHistory] = useState<AssessmentHistoryEntry[] | null>(null)
  const [generatingCourseId, setGeneratingCourseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.courses.list().then(setCourses)
    window.studyos.exams.listHistory().then(setHistory)
  }, [])

  async function handleGenerate(courseId: string): Promise<void> {
    setGeneratingCourseId(courseId)
    setError(null)
    try {
      const { attemptId } = await window.studyos.exams.generate(courseId)
      navigate(`/exams/${attemptId}`)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
      setGeneratingCourseId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Exámenes</h1>
        <p className="text-sm text-text-secondary">
          Genera un examen de práctica a partir de un curso y revisa tu historial.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {courses === null && <LoadingState label="Cargando cursos..." />}

      {courses !== null && courses.length === 0 && (
        <EmptyState
          title="Todavía no tienes cursos"
          description="Crea un curso desde tu biblioteca para poder generar un examen."
          action={
            <Link to="/courses/new">
              <Button size="sm">+ Crear curso</Button>
            </Link>
          }
        />
      )}

      {courses !== null && courses.length > 0 && (
        <div className="flex flex-col gap-2">
          {courses.map((course) => (
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
                {generatingCourseId === course.id ? 'Generando...' : 'Nuevo examen'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Historial</h2>
        {history === null && <LoadingState label="Cargando historial..." />}
        {history !== null && history.length === 0 && (
          <p className="text-xs text-text-muted">Todavía no completaste ningún examen.</p>
        )}
        {history !== null && history.length > 0 && (
          <div className="flex flex-col gap-2">
            {history.map((entry) => (
              <Link key={entry.id} to={`/exams/results/${entry.id}`}>
                <Card className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {entry.courseTitle}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(entry.completedAt).toLocaleDateString()} · {entry.totalQuestions}{' '}
                      preguntas
                    </p>
                  </div>
                  <StatusBadge tone={scoreTone(entry.score)}>{entry.score}%</StatusBadge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
