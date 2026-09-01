import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, LoadingState, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { Course } from '@shared/types/courses'
import type { ConceptMastery, CourseMastery, MasteryState } from '@shared/types/mastery'

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

function ConceptNode({
  concept,
  courseId,
  expanded,
  onToggle
}: {
  concept: ConceptMastery
  courseId: string
  expanded: boolean
  onToggle: () => void
}): React.JSX.Element {
  return (
    <li className="rounded-md border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 p-2 text-left text-xs"
      >
        <span className="text-text-primary">{concept.title}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-text-muted">{concept.score}%</span>
          <StatusBadge tone={STATE_TONE[concept.state]}>{STATE_LABEL[concept.state]}</StatusBadge>
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-border p-2 text-xs text-text-secondary">
          <p>Evidencia registrada: {concept.evidenceCount}</p>
          {concept.sources.length === 0 && (
            <p className="text-text-muted">Sin fuentes citadas todavía.</p>
          )}
          {concept.sources.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="font-medium text-text-muted">Fuentes</span>
              {concept.sources.map((source) => (
                <Link
                  key={`${source.documentId}-${source.pageStart}`}
                  to={`/library/${source.documentId}?page=${source.pageStart}`}
                  className="text-primary hover:underline"
                >
                  {source.documentTitle} · p.{' '}
                  {source.pageStart === source.pageEnd
                    ? source.pageStart
                    : `${source.pageStart}–${source.pageEnd}`}
                </Link>
              ))}
            </div>
          )}
          <Link to={`/courses/${courseId}`} className="text-primary hover:underline">
            Ver curso
          </Link>
        </div>
      )}
    </li>
  )
}

function CourseTree({ course }: { course: Course }): React.JSX.Element {
  const navigate = useNavigate()
  const [mastery, setMastery] = useState<CourseMastery | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [startingRemediation, setStartingRemediation] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.mastery.getCourseMastery(course.id).then(setMastery)
  }, [course.id])

  async function handleRemediation(): Promise<void> {
    setStartingRemediation(true)
    setError(null)
    try {
      await window.studyos.study.startRemediation(course.id)
      navigate(`/study/${course.id}`)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
      setStartingRemediation(false)
    }
  }

  if (mastery !== null && mastery.concepts.length === 0) {
    return (
      <Card>
        <p className="text-sm font-semibold text-text-primary">{course.title}</p>
        <p className="text-xs text-text-muted">Este curso todavía no tiene conceptos rastreados.</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-text-primary">{course.title}</p>
        {mastery && mastery.weakConcepts.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRemediation}
            disabled={startingRemediation}
          >
            {startingRemediation ? 'Preparando...' : 'Estudiar ahora'}
          </Button>
        )}
      </div>

      {mastery === null && <LoadingState label="Cargando conceptos..." />}
      {error && <p className="text-xs text-danger">{error}</p>}

      {mastery && (
        <ul className="flex flex-col gap-1">
          {mastery.concepts.map((concept) => (
            <ConceptNode
              key={concept.conceptId}
              concept={concept}
              courseId={course.id}
              expanded={expandedId === concept.conceptId}
              onToggle={() =>
                setExpandedId((current) =>
                  current === concept.conceptId ? null : concept.conceptId
                )
              }
            />
          ))}
        </ul>
      )}
    </Card>
  )
}

export function KnowledgeMapPage(): React.JSX.Element {
  const [courses, setCourses] = useState<Course[] | null>(null)

  useEffect(() => {
    window.studyos.courses.list().then(setCourses)
  }, [])

  if (courses === null) {
    return <LoadingState label="Cargando cursos..." />
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        title="Todavía no tienes cursos"
        description="Crea un curso desde tu biblioteca para ver su mapa de conocimiento."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Mapa de Conocimiento</h1>
        <p className="text-sm text-text-secondary">
          Los conceptos que cubre cada curso y tu dominio de cada uno. Toca un concepto para ver sus
          fuentes.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {courses.map((course) => (
          <CourseTree key={course.id} course={course} />
        ))}
      </div>
    </div>
  )
}
