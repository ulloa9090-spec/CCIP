import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, LoadingState, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import type { AssessmentResult } from '@shared/types/assessment'

function scoreTone(score: number): StatusTone {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'danger'
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}:${remaining.toString().padStart(2, '0')}`
}

export function QuizResultsPage(): React.JSX.Element {
  const { attemptId } = useParams<{ attemptId: string }>()
  const [result, setResult] = useState<AssessmentResult | null>(null)

  useEffect(() => {
    if (!attemptId) return
    window.studyos.exams.getResult(attemptId).then(setResult)
  }, [attemptId])

  if (!result) {
    return <LoadingState label="Cargando resultados..." />
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-xs text-text-muted">{result.courseTitle}</p>
        <p className="text-4xl font-semibold text-text-primary">
          <StatusBadge tone={scoreTone(result.score)}>{result.score}%</StatusBadge>
        </p>
        <p className="text-sm text-text-secondary">
          {result.correctCount} de {result.totalQuestions} correctas ·{' '}
          {formatDuration(result.durationSeconds)}
        </p>
        {result.previousAverageScore !== null && (
          <p className="text-xs text-text-muted">
            Promedio de intentos anteriores: {result.previousAverageScore}%
            {result.score > result.previousAverageScore ? ' — ¡mejoraste!' : ''}
          </p>
        )}
        <Link to="/exams">
          <Button size="sm" variant="ghost">
            Volver a Exámenes
          </Button>
        </Link>
      </Card>

      <div className="flex flex-col gap-3">
        {result.questions.map((question, index) => (
          <Card key={question.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-text-primary">
                {index + 1}. {question.prompt}
              </p>
              <StatusBadge tone={question.isCorrect ? 'success' : 'danger'}>
                {question.isCorrect ? 'Correcta' : 'Incorrecta'}
              </StatusBadge>
            </div>
            <ul className="flex flex-col gap-1 text-xs">
              {question.choices.map((choice, choiceIndex) => {
                const isCorrectChoice = choiceIndex === question.correctIndex
                const isSelected = choiceIndex === question.selectedIndex
                return (
                  <li
                    key={choiceIndex}
                    className={
                      isCorrectChoice
                        ? 'font-medium text-success'
                        : isSelected
                          ? 'text-danger'
                          : 'text-text-secondary'
                    }
                  >
                    {choice}
                    {isCorrectChoice ? ' ✓' : isSelected ? ' ✗' : ''}
                  </li>
                )
              })}
            </ul>
            <p className="text-xs text-text-secondary">{question.explanation}</p>
            {question.sourceRefs.length > 0 && (
              <div className="flex flex-col gap-1">
                {question.sourceRefs.map((source) => (
                  <Link
                    key={`${source.documentId}-${source.pageStart}`}
                    to={`/library/${source.documentId}?page=${source.pageStart}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {source.documentTitle} · p.{' '}
                    {source.pageStart === source.pageEnd
                      ? source.pageStart
                      : `${source.pageStart}–${source.pageEnd}`}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
