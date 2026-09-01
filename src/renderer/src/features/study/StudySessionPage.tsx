import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, LoadingState, StatusBadge } from '../../design-system'
import { NotesPanel } from '../notes/NotesPanel'
import { parseSerializedAppError, type SerializedAppError } from '@shared/types/errors'
import type { StudySessionDetail } from '@shared/types/study'

export function StudySessionPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const [detail, setDetail] = useState<StudySessionDetail | null>(null)
  const [viewedIndex, setViewedIndex] = useState(0)
  const [appError, setAppError] = useState<SerializedAppError | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)

  useEffect(() => {
    if (!courseId) return
    window.studyos.study.startOrResume(courseId).then(
      (session) => {
        setDetail(session)
        const firstPending = session.activities.findIndex((activity) => !activity.completedAt)
        setViewedIndex(firstPending === -1 ? session.activities.length : firstPending)
      },
      (err) => setAppError(parseSerializedAppError(err))
    )
  }, [courseId])

  async function handleQuickCheck(understood: boolean): Promise<void> {
    const activity = detail?.activities[viewedIndex]
    if (!activity) return
    const updated = await window.studyos.study.completeActivity(activity.id, understood)
    setDetail(updated)
  }

  if (appError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <h1 className="text-lg font-semibold text-text-primary">
          {appError.code === 'COURSE_COMPLETE'
            ? '¡Ya completaste este curso!'
            : 'No se pudo cargar la sesión'}
        </h1>
        <p className="text-sm text-text-secondary">{appError.userMessage}</p>
        {courseId && (
          <Link to={`/courses/${courseId}`}>
            <Button size="sm" variant="ghost">
              Volver al curso
            </Button>
          </Link>
        )}
      </Card>
    )
  }

  if (!detail) {
    return <LoadingState label="Preparando tu sesión..." />
  }

  const activity = detail.activities[viewedIndex]

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{detail.courseTitle}</span>
        <span>
          {Math.min(viewedIndex + 1, detail.activities.length)} / {detail.activities.length}
        </span>
      </div>

      {activity ? (
        <Card className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{activity.lessonTitle}</h1>
            {activity.completedAt && <StatusBadge tone="success">Entendido</StatusBadge>}
          </div>

          {activity.lessonSummary && (
            <p className="whitespace-pre-wrap text-sm text-text-secondary">
              {activity.lessonSummary}
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activity.completedAt ? 'secondary' : 'primary'}
              onClick={() => handleQuickCheck(true)}
            >
              Entendido
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleQuickCheck(false)}>
              Necesito repasar
            </Button>
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setViewedIndex((i) => i + 1)}>
              Continuar →
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <h1 className="text-lg font-semibold text-text-primary">
            {detail.status === 'completed' ? '¡Sesión completada!' : 'Fin de la sesión de hoy'}
          </h1>
          <p className="text-sm text-text-secondary">
            {detail.status === 'completed'
              ? `Completaste esta sesión en ${detail.actualMinutes ?? detail.estimatedMinutes} minutos.`
              : 'Todavía tienes lecciones de esta sesión sin marcar como entendidas. Puedes continuar cuando quieras.'}
          </p>
          {courseId && (
            <Link to={`/courses/${courseId}`}>
              <Button size="sm" variant="ghost">
                Volver al curso
              </Button>
            </Link>
          )}
        </Card>
      )}

      {courseId && (
        <div>
          <button
            type="button"
            onClick={() => setNotesOpen((open) => !open)}
            className="text-xs text-text-muted hover:underline"
          >
            {notesOpen ? 'Ocultar notas' : '+ Nota'}
          </button>
          {notesOpen && (
            <div className="mt-2">
              <NotesPanel courseId={courseId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
