import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, LoadingState } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { CourseStyle } from '@shared/types/courses'
import type { LibraryDocument } from '@shared/types/documents'

const STYLE_OPTIONS: { value: CourseStyle; label: string; description: string }[] = [
  {
    value: 'equilibrado',
    label: 'Equilibrado',
    description: 'Teoría, práctica y evaluación por igual.'
  },
  { value: 'visual', label: 'Visual', description: 'Prioriza diagramas, tablas y comparaciones.' },
  { value: 'practico', label: 'Práctico', description: 'Más ejercicios y casos aplicados.' },
  {
    value: 'conversacional',
    label: 'Conversacional',
    description: 'Tono de diálogo, como un tutor hablando.'
  },
  { value: 'examen', label: 'Examen', description: 'Orientado a preparar una evaluación formal.' }
]

const STEP_LABELS = ['Objetivo', 'Material', 'Tiempo', 'Estilo', 'Confirmación']

function formatTargetDate(durationDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + durationDays)
  return date.toISOString().slice(0, 10)
}

export function CreateCoursePage(): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedDocumentId = searchParams.get('documentId')

  const [step, setStep] = useState(1)
  const [documents, setDocuments] = useState<LibraryDocument[] | null>(null)
  const [objective, setObjective] = useState('')
  const [documentIds, setDocumentIds] = useState<string[]>(
    preselectedDocumentId ? [preselectedDocumentId] : []
  )
  const [durationDays, setDurationDays] = useState(14)
  const [dailyMinutes, setDailyMinutes] = useState(30)
  const [style, setStyle] = useState<CourseStyle>('equilibrado')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.studyos.documents.list().then((list) => {
      setDocuments(list.filter((doc) => doc.status === 'ready'))
    })
  }, [])

  function toggleDocument(id: string): void {
    setDocumentIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  const canAdvance =
    (step === 1 && objective.trim().length > 0) ||
    (step === 2 && documentIds.length > 0) ||
    step === 3 ||
    step === 4

  async function handleCreate(): Promise<void> {
    setCreating(true)
    setError(null)
    try {
      const course = await window.studyos.courses.create({
        objective: objective.trim(),
        documentIds,
        durationDays,
        dailyMinutes,
        style
      })
      navigate(`/courses/${course.id}`)
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
      setCreating(false)
    }
  }

  const selectedTitles = documents?.filter((doc) => documentIds.includes(doc.id)) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Crear curso</h1>
        <p className="text-sm text-text-secondary">
          Paso {step} de {STEP_LABELS.length} — {STEP_LABELS[step - 1]}
        </p>
      </div>

      <Card className="flex flex-col gap-4">
        {step === 1 && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="objective">
              ¿Qué quieres lograr?
            </label>
            <textarea
              id="objective"
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="Ej: aprobar el examen de licencia de contratista residencial"
              rows={4}
              className="rounded-md border border-border bg-background p-3 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-primary">Selecciona el material</p>
            {documents === null && <LoadingState label="Cargando documentos..." />}
            {documents !== null && documents.length === 0 && (
              <p className="text-xs text-text-muted">
                No tienes documentos listos todavía. Impórtalos primero desde la Biblioteca.
              </p>
            )}
            {documents !== null && documents.length > 0 && (
              <ul className="flex flex-col gap-1">
                {documents.map((doc) => (
                  <li key={doc.id}>
                    <label className="flex items-center gap-2 rounded-md border border-border p-2 text-sm text-text-primary">
                      <input
                        type="checkbox"
                        checked={documentIds.includes(doc.id)}
                        onChange={() => toggleDocument(doc.id)}
                      />
                      {doc.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary" htmlFor="durationDays">
                Duración (días)
              </label>
              <input
                id="durationDays"
                type="number"
                min={1}
                value={durationDays}
                onChange={(event) => setDurationDays(Number(event.target.value) || 1)}
                className="h-9 w-32 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary" htmlFor="dailyMinutes">
                Minutos por día
              </label>
              <input
                id="dailyMinutes"
                type="number"
                min={5}
                value={dailyMinutes}
                onChange={(event) => setDailyMinutes(Number(event.target.value) || 5)}
                className="h-9 w-32 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-primary">Estilo del curso</p>
            <div className="flex flex-col gap-2">
              {STYLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start gap-2 rounded-md border border-border p-2 text-sm text-text-primary"
                >
                  <input
                    type="radio"
                    name="style"
                    checked={style === option.value}
                    onChange={() => setStyle(option.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium">{option.label}</span>
                    <span className="block text-xs text-text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-2 text-sm text-text-primary">
            <p>
              <span className="text-text-muted">Objetivo: </span>
              {objective}
            </p>
            <p>
              <span className="text-text-muted">Material: </span>
              {selectedTitles.map((doc) => doc.title).join(', ')}
            </p>
            <p>
              <span className="text-text-muted">Tiempo estimado: </span>
              {durationDays} días · {dailyMinutes} min/día · fecha final aproximada{' '}
              {formatTargetDate(durationDays)}
            </p>
            <p>
              <span className="text-text-muted">Estilo: </span>
              {STYLE_OPTIONS.find((option) => option.value === style)?.label}
            </p>
            <p className="text-xs text-text-muted">
              Estas son estimaciones. La IA generará la estructura real del curso (módulos y
              lecciones) al confirmar — puede tardar unos segundos.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || creating}
          >
            Atrás
          </Button>
          {step < 5 ? (
            <Button size="sm" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
              Siguiente
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creando curso...' : 'Crear curso'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
