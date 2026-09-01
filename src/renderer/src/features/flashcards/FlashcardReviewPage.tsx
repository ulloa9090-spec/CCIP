import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Card, LoadingState } from '../../design-system'
import type { Flashcard, FlashcardRating } from '@shared/types/flashcards'

const RATING_LABEL: Record<FlashcardRating, string> = {
  again: 'Otra vez',
  hard: 'Difícil',
  good: 'Bien',
  easy: 'Fácil'
}

const RATINGS: FlashcardRating[] = ['again', 'hard', 'good', 'easy']

export function FlashcardReviewPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const [queue, setQueue] = useState<Flashcard[] | null>(null)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!courseId) return
    window.studyos.flashcards.getReviewQueue(courseId).then(setQueue)
  }, [courseId])

  async function handleRate(rating: FlashcardRating): Promise<void> {
    if (!queue) return
    const card = queue[index]
    setSubmitting(true)
    await window.studyos.flashcards.submitReview(card.id, rating)
    setSubmitting(false)
    setRevealed(false)
    setIndex((i) => i + 1)
  }

  if (!queue) {
    return <LoadingState label="Cargando repaso..." />
  }

  if (queue.length === 0 || index >= queue.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <Card className="p-8 text-center">
          <p className="text-base font-semibold text-text-primary">¡Repaso completo!</p>
          <p className="mt-1 text-sm text-text-secondary">
            No quedan más tarjetas por repasar en este curso por ahora.
          </p>
        </Card>
      </div>
    )
  }

  const card = queue[index]

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Repaso</span>
        <span>
          {index + 1} / {queue.length}
        </span>
      </div>

      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-base font-medium text-text-primary">{card.front}</p>

        {!revealed && (
          <Button size="sm" onClick={() => setRevealed(true)}>
            Mostrar respuesta
          </Button>
        )}

        {revealed && (
          <div className="flex w-full flex-col gap-3 border-t border-border pt-4">
            <p className="text-sm text-text-secondary">{card.back}</p>
            {card.hint && <p className="text-xs text-text-muted">Pista: {card.hint}</p>}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {RATINGS.map((rating) => (
                <Button
                  key={rating}
                  size="sm"
                  variant={rating === 'again' ? 'ghost' : 'primary'}
                  onClick={() => handleRate(rating)}
                  disabled={submitting}
                >
                  {RATING_LABEL[rating]}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
