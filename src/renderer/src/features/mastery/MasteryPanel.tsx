import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, LoadingState, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { CourseMastery, MasteryState } from '@shared/types/mastery'

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

export function MasteryPanel({ courseId }: { courseId: string }): React.JSX.Element | null {
  const navigate = useNavigate()
  const [mastery, setMastery] = useState<CourseMastery | null>(null)
  const [startingRemediation, setStartingRemediation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.mastery.getCourseMastery(courseId).then(setMastery)
  }, [courseId])

  async function handleRemediation(): Promise<void> {
    setStartingRemediation(true)
    setError(null)
    try {
      await window.studyos.study.startRemediation(courseId)
      navigate(`/study/${courseId}`)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
      setStartingRemediation(false)
    }
  }

  // A course generated before Fase 8, or one with no concepts yet, has nothing to show here.
  if (mastery !== null && mastery.concepts.length === 0) {
    return null
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-text-primary">Dominio</p>
        {mastery && mastery.weakConcepts.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemediation}
            disabled={startingRemediation}
          >
            {startingRemediation ? 'Preparando...' : 'Crear sesión de recuperación'}
          </Button>
        )}
      </div>

      {mastery === null && <LoadingState label="Cargando dominio..." />}
      {error && <p className="text-xs text-danger">{error}</p>}

      {mastery && (
        <ul className="flex flex-col gap-1">
          {mastery.concepts.map((concept) => (
            <li
              key={concept.conceptId}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-xs"
            >
              <span className="text-text-primary">{concept.title}</span>
              <StatusBadge tone={STATE_TONE[concept.state]}>
                {STATE_LABEL[concept.state]}
              </StatusBadge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
