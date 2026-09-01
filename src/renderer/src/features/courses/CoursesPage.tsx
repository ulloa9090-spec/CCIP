import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  ProgressBar,
  StatusBadge
} from '../../design-system'
import type { StatusTone } from '../../design-system'
import type { Course, CourseStatus } from '@shared/types/courses'

const STATUS_LABEL: Record<CourseStatus, string> = {
  active: 'En curso',
  completed: 'Completado',
  archived: 'Archivado'
}

const STATUS_TONE: Record<CourseStatus, StatusTone> = {
  active: 'warning',
  completed: 'success',
  archived: 'muted'
}

export function CoursesPage(): React.JSX.Element {
  const [courses, setCourses] = useState<Course[] | null>(null)

  useEffect(() => {
    window.studyos.courses.list().then(setCourses)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Mis Cursos</h1>
          <p className="text-sm text-text-secondary">
            Cursos generados a partir de los documentos de tu biblioteca.
          </p>
        </div>
        <Link to="/courses/new">
          <Button>+ Crear curso</Button>
        </Link>
      </div>

      {courses === null && <LoadingState label="Cargando cursos..." />}

      {courses !== null && courses.length === 0 && (
        <EmptyState
          title="Todavía no tienes cursos"
          description="Crea un curso a partir de uno o varios documentos de tu biblioteca."
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
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{course.title}</p>
                    <p className="truncate text-xs text-text-muted">{course.objective}</p>
                  </div>
                  <StatusBadge tone={STATUS_TONE[course.status]}>
                    {STATUS_LABEL[course.status]}
                  </StatusBadge>
                </div>
                <ProgressBar value={course.progress} tone="success" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
