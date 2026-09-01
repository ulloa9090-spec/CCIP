import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, EmptyState, LoadingState, ProgressBar, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import type { ProgressSummary } from '@shared/types/progress'
import type { MasteryState } from '@shared/types/mastery'

const STATE_LABEL: Record<MasteryState, string> = {
  new: 'Sin evidencia',
  learning: 'Aprendiendo',
  familiar: 'Familiar',
  competent: 'Competente',
  mastered: 'Dominado'
}

const STATE_TONE: Record<MasteryState, StatusTone> = {
  new: 'muted',
  learning: 'danger',
  familiar: 'warning',
  competent: 'success',
  mastered: 'success'
}

function scoreTone(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

function StatCard({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint?: string
}): React.JSX.Element {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </Card>
  )
}

export function ProgressPage(): React.JSX.Element {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)

  useEffect(() => {
    window.studyos.progress.getSummary().then(setSummary)
  }, [])

  if (!summary) {
    return <LoadingState label="Cargando progreso..." />
  }

  const hasAnyActivity =
    summary.activeCourseCount + summary.completedCourseCount > 0 ||
    summary.examHistory.length > 0 ||
    summary.totalStudyMinutes > 0

  if (!hasAnyActivity) {
    return (
      <EmptyState
        title="Todavía no hay progreso que mostrar"
        description="Crea un curso y empieza a estudiar para ver tus estadísticas aquí."
      />
    )
  }

  const pacePerDay = Math.round(summary.studyMinutesLast7Days / 7)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Progreso</h1>
        <p className="text-sm text-text-secondary">Resumen de tu avance en todos tus cursos.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Cursos activos" value={String(summary.activeCourseCount)} />
        <StatCard label="Cursos completados" value={String(summary.completedCourseCount)} />
        <StatCard label="Progreso promedio" value={`${summary.averageProgress}%`} />
        <StatCard label="Racha" value={`🔥 ${summary.currentStreakDays} días`} />
        <StatCard
          label="Tiempo de estudio"
          value={`${summary.totalStudyMinutes} min`}
          hint={`${summary.studyMinutesLast7Days} min en los últimos 7 días`}
        />
        <StatCard label="Ritmo" value={`${pacePerDay} min/día`} hint="Promedio, últimos 7 días" />
        <StatCard
          label="Precisión en exámenes"
          value={summary.quizAccuracy === null ? '—' : `${summary.quizAccuracy}%`}
        />
        <StatCard
          label="Precisión en flashcards"
          value={summary.flashcardAccuracy === null ? '—' : `${summary.flashcardAccuracy}%`}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Dominio por tema</h2>
        {summary.courseMastery.length === 0 && (
          <p className="text-xs text-text-muted">
            Todavía no hay conceptos rastreados en ningún curso.
          </p>
        )}
        {summary.courseMastery.length > 0 && (
          <div className="flex flex-col gap-2">
            {summary.courseMastery.map((entry) => (
              <Card key={entry.courseId} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Link
                    to={`/courses/${entry.courseId}`}
                    className="truncate text-sm font-medium text-text-primary hover:underline"
                  >
                    {entry.courseTitle}
                  </Link>
                  <span className="shrink-0 text-xs text-text-muted">{entry.averageScore}%</span>
                </div>
                <ProgressBar value={entry.averageScore} tone={scoreTone(entry.averageScore)} />
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Conceptos en riesgo</h2>
        {summary.conceptsAtRisk.length === 0 && (
          <p className="text-xs text-text-muted">No hay conceptos débiles detectados por ahora.</p>
        )}
        {summary.conceptsAtRisk.length > 0 && (
          <div className="flex flex-col gap-2">
            {summary.conceptsAtRisk.map((concept) => (
              <Link key={concept.conceptId} to={`/courses/${concept.courseId}`}>
                <Card className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {concept.title}
                    </p>
                    <p className="truncate text-xs text-text-muted">{concept.courseTitle}</p>
                  </div>
                  <StatusBadge tone={STATE_TONE[concept.state]}>
                    {STATE_LABEL[concept.state]}
                  </StatusBadge>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Historial de exámenes</h2>
        {summary.examHistory.length === 0 && (
          <p className="text-xs text-text-muted">Todavía no completaste ningún examen.</p>
        )}
        {summary.examHistory.length > 0 && (
          <div className="flex flex-col gap-2">
            {summary.examHistory.map((entry) => (
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
