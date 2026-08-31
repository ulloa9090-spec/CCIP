import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, LoadingState, ProgressBar, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import type { CourseDetail, LessonStatus, LessonType, ModuleStatus } from '@shared/types/courses'

const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  lesson: 'Lección',
  practice: 'Práctica',
  assessment: 'Evaluación'
}

const LESSON_STATUS_ICON: Record<LessonStatus, string> = {
  not_started: '○',
  in_progress: '▶',
  completed: '✓'
}

const MODULE_STATUS_TONE: Record<ModuleStatus, StatusTone> = {
  not_started: 'muted',
  in_progress: 'warning',
  completed: 'success'
}

const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  not_started: 'Sin empezar',
  in_progress: 'En progreso',
  completed: 'Completado'
}

export function CourseDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    window.studyos.courses.get(id).then(setCourse, () => setNotFound(true))
  }, [id])

  if (notFound) {
    return <p className="text-sm text-danger">Curso no encontrado.</p>
  }

  if (!course) {
    return <LoadingState label="Cargando curso..." />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{course.title}</h1>
            <p className="text-sm text-text-secondary">Objetivo: {course.objective}</p>
          </div>
          <p className="shrink-0 text-2xl font-semibold text-success">{course.progress}%</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar value={course.progress} tone="success" />
          </div>
          {course.targetDate && (
            <p className="shrink-0 text-xs text-text-muted">Meta: {course.targetDate}</p>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {course.modules.map((module, index) => (
          <Card key={module.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-text-primary">
                Módulo {index + 1} — {module.title}
              </p>
              <StatusBadge tone={MODULE_STATUS_TONE[module.status]}>
                {MODULE_STATUS_LABEL[module.status]}
              </StatusBadge>
            </div>
            <ul className="flex flex-col gap-1">
              {module.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span aria-hidden="true" className="text-text-muted">
                    {LESSON_STATUS_ICON[lesson.status]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-text-primary">
                      {lesson.title}{' '}
                      <span className="text-text-muted">
                        · {LESSON_TYPE_LABEL[lesson.type]} · {lesson.estimatedMinutes} min
                      </span>
                    </p>
                    {lesson.summary && <p className="text-text-muted">{lesson.summary}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
