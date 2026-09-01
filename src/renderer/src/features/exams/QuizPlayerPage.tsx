import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, LoadingState } from '../../design-system'
import type { AttemptDetail } from '@shared/types/assessment'

export function QuizPlayerPage(): React.JSX.Element {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [index, setIndex] = useState(0)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (!attemptId) return
    window.studyos.exams.getAttempt(attemptId).then((attempt) => {
      if (attempt.completedAt) {
        navigate(`/exams/results/${attemptId}`, { replace: true })
        return
      }
      setDetail(attempt)
    })
  }, [attemptId, navigate])

  async function handleSelect(questionId: string, choiceIndex: number): Promise<void> {
    if (!attemptId) return
    // Optimistic update: the radio must reflect the click immediately (it's
    // a controlled input), not only once the IPC round-trip resolves.
    setDetail((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) =>
              q.id === questionId ? { ...q, selectedIndex: choiceIndex } : q
            )
          }
        : prev
    )
    const updated = await window.studyos.exams.submitAnswer(attemptId, questionId, choiceIndex)
    setDetail(updated)
  }

  async function handleFinish(): Promise<void> {
    if (!attemptId || !detail) return
    const unanswered = detail.questions.filter((q) => q.selectedIndex === null).length
    if (unanswered > 0) {
      const proceed = window.confirm(
        `Tienes ${unanswered} pregunta(s) sin responder. ¿Finalizar de todas formas?`
      )
      if (!proceed) return
    }
    setFinishing(true)
    await window.studyos.exams.finish(attemptId)
    navigate(`/exams/results/${attemptId}`)
  }

  if (!detail) {
    return <LoadingState label="Cargando examen..." />
  }

  const question = detail.questions[index]
  const isLast = index === detail.questions.length - 1

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{detail.courseTitle}</span>
        <span>
          {index + 1} / {detail.questions.length}
        </span>
      </div>

      <Card className="flex flex-col gap-4">
        <p className="text-base font-medium text-text-primary">{question.prompt}</p>

        <div className="flex flex-col gap-2">
          {question.choices.map((choice, choiceIndex) => (
            <label
              key={choiceIndex}
              className="flex items-center gap-2 rounded-md border border-border p-2 text-sm text-text-primary hover:bg-surface-elevated"
            >
              <input
                type="radio"
                name={question.id}
                checked={question.selectedIndex === choiceIndex}
                onChange={() => handleSelect(question.id, choiceIndex)}
              />
              {choice}
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            Anterior
          </Button>
          {isLast ? (
            <Button size="sm" onClick={handleFinish} disabled={finishing}>
              {finishing ? 'Calificando...' : 'Finalizar examen'}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
              Siguiente
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
