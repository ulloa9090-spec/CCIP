import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, EmptyState, LoadingState, ProgressBar } from '../../design-system'
import type { Course } from '@shared/types/courses'

export function PlanLandingPage(): React.JSX.Element {
  const [courses, setCourses] = useState<Course[] | null>(null)

  useEffect(() => {
    window.studyos.courses.list().then((list) => {
      setCourses(list.filter((course) => course.status === 'active'))
    })
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Plan de Estudio</h1>
        <p className="text-sm text-text-secondary">
          El calendario de cada curso según tu meta y tus minutos diarios.
        </p>
      </div>

      {courses === null && <LoadingState label="Cargando cursos..." />}

      {courses !== null && courses.length === 0 && (
        <EmptyState
          title="No tienes cursos activos"
          description="Crea un curso desde tu biblioteca para ver su plan de estudio."
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
                <div className="mt-2">
                  <ProgressBar value={course.progress} tone="success" />
                </div>
              </div>
              <Link to={`/plan/${course.id}`}>
                <Button size="sm">Ver plan</Button>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
