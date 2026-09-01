import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Card, LoadingState, StatusBadge } from '../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { Flashcard } from '@shared/types/flashcards'

export function FlashcardDeckPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>()
  const [cards, setCards] = useState<Flashcard[] | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [hint, setHint] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!courseId) return
    window.studyos.flashcards.getDeck(courseId).then(setCards)
  }, [courseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleCreate(): Promise<void> {
    if (!courseId || !front.trim() || !back.trim()) return
    setSaving(true)
    setError(null)
    try {
      await window.studyos.flashcards.createManual({
        courseId,
        front: front.trim(),
        back: back.trim(),
        hint: hint.trim() || null
      })
      setFront('')
      setBack('')
      setHint('')
      setShowCreate(false)
      refresh()
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateMore(): Promise<void> {
    if (!courseId) return
    setGenerating(true)
    setError(null)
    try {
      await window.studyos.flashcards.generate(courseId)
      refresh()
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
    } finally {
      setGenerating(false)
    }
  }

  if (!cards) {
    return <LoadingState label="Cargando tarjetas..." />
  }

  const dueCount = cards.filter((card) => card.dueToday).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Deck</h1>
          <p className="text-sm text-text-secondary">{cards.length} tarjetas</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={handleGenerateMore} disabled={generating}>
            {generating ? 'Generando...' : 'Generar más con IA'}
          </Button>
          {dueCount > 0 && courseId && (
            <Link to={`/flashcards/${courseId}/review`}>
              <Button size="sm">Repasar ahora ({dueCount})</Button>
            </Link>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Nueva tarjeta</p>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate((open) => !open)}>
            {showCreate ? 'Cancelar' : '+ Nueva tarjeta'}
          </Button>
        </div>
        {showCreate && (
          <div className="flex flex-col gap-2">
            <input
              value={front}
              onChange={(event) => setFront(event.target.value)}
              placeholder="Pregunta / término (front)"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted"
            />
            <input
              value={back}
              onChange={(event) => setBack(event.target.value)}
              placeholder="Respuesta / definición (back)"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted"
            />
            <input
              value={hint}
              onChange={(event) => setHint(event.target.value)}
              placeholder="Pista (opcional)"
              className="h-9 rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted"
            />
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={saving || !front.trim() || !back.trim()}
            >
              Guardar tarjeta
            </Button>
          </div>
        )}
      </Card>

      {cards.length === 0 && (
        <Card className="p-6 text-center text-sm text-text-secondary">
          Este curso todavía no tiene tarjetas.
        </Card>
      )}

      {cards.length > 0 && (
        <div className="flex flex-col gap-2">
          {cards.map((card) => (
            <Card key={card.id} className="flex flex-col gap-1">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-text-primary">{card.front}</p>
                {card.dueToday && <StatusBadge tone="warning">Hoy</StatusBadge>}
              </div>
              <p className="text-xs text-text-secondary">{card.back}</p>
              {card.hint && <p className="text-xs text-text-muted">Pista: {card.hint}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
