import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, LoadingState, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { PlannedDayStatus, StudyPlan } from '@shared/types/plan'

const DAY_STATUS_LABEL: Record<PlannedDayStatus, string> = {
  completed: 'Completado',
  missed: 'Atrasada',
  today: 'Hoy',
  upcoming: 'Próxima'
}

const DAY_STATUS_TONE: Record<PlannedDayStatus, StatusTone> = {
  completed: 'success',
  missed: 'danger',
  today: 'warning',
  upcoming: 'muted'
}

function formatDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString()
}

export function PlanDetailPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [editingGoal, setEditingGoal] = useState(false)
  const [targetDateInput, setTargetDateInput] = useState('')
  const [dailyMinutesInput, setDailyMinutesInput] = useState(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) return
    window.studyos.plan.get(courseId).then((result) => {
      setPlan(result)
      setTargetDateInput(result.targetDate)
      setDailyMinutesInput(result.dailyMinutes)
    })
  }, [courseId])

  async function handleRecalculate(): Promise<void> {
    if (!courseId) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.studyos.plan.recalculate(courseId, {})
      setPlan(result)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
    } finally {
      setBusy(false)
    }
  }

  async function handleChangeGoal(): Promise<void> {
    if (!courseId) return
    setBusy(true)
    setError(null)
    try {
      const result = await window.studyos.plan.recalculate(courseId, {
        targetDate: targetDateInput,
        dailyMinutes: dailyMinutesInput
      })
      setPlan(result)
      setEditingGoal(false)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
    } finally {
      setBusy(false)
    }
  }

  if (!plan) {
    return <LoadingState label="Cargando plan..." />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{plan.courseTitle}</h1>
            <p className="text-xs text-text-muted">
              Meta: {formatDate(plan.targetDate)} · {plan.dailyMinutes} min/día
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingGoal((open) => !open)}>
              Cambiar meta
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRecalculate} disabled={busy}>
              {busy ? 'Recalculando...' : 'Recalcular plan'}
            </Button>
          </div>
        </div>

        {!plan.feasible && (
          <p className="text-xs text-danger">
            El trabajo pendiente no cabe con esta meta — considera extender la fecha objetivo o
            aumentar los minutos diarios.
          </p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}

        {editingGoal && (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted" htmlFor="targetDate">
                Fecha objetivo
              </label>
              <input
                id="targetDate"
                type="date"
                value={targetDateInput}
                onChange={(event) => setTargetDateInput(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted" htmlFor="dailyMinutes">
                Minutos por día
              </label>
              <input
                id="dailyMinutes"
                type="number"
                min={5}
                value={dailyMinutesInput}
                onChange={(event) => setDailyMinutesInput(Number(event.target.value) || 5)}
                className="h-9 w-28 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
              />
            </div>
            <Button size="sm" onClick={handleChangeGoal} disabled={busy}>
              Guardar
            </Button>
          </div>
        )}
      </Card>

      {plan.days.length === 0 && (
        <Card className="p-6 text-center text-sm text-text-secondary">
          No quedan lecciones pendientes en este curso.
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {plan.days.map((day) => (
          <Card key={day.date} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-text-primary">{formatDate(day.date)}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">{day.estimatedMinutes} min</span>
                <StatusBadge tone={DAY_STATUS_TONE[day.status]}>
                  {DAY_STATUS_LABEL[day.status]}
                </StatusBadge>
              </div>
            </div>
            <ul className="flex flex-col gap-1 text-xs text-text-secondary">
              {day.lessons.map((lesson) => (
                <li key={lesson.lessonId}>
                  {lesson.completed ? '✓ ' : '○ '}
                  {lesson.title}
                </li>
              ))}
            </ul>
            {day.status === 'today' && courseId && (
              <Link to={`/study/${courseId}`}>
                <Button size="sm">Ir a estudiar</Button>
              </Link>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
