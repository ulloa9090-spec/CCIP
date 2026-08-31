import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../design-system'
import type { Note } from '@shared/types/notes'

export function NotesPanel({ courseId }: { courseId: string }): React.JSX.Element {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(() => {
    window.studyos.notes.listByCourse(courseId).then(setNotes)
  }, [courseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleSave(): Promise<void> {
    const body = draft.trim()
    if (!body) return
    setSaving(true)
    await window.studyos.notes.create({ body, courseId })
    setDraft('')
    setSaving(false)
    refresh()
  }

  async function handleDelete(id: string): Promise<void> {
    await window.studyos.notes.delete(id)
    refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-text-primary">Notas</p>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe una nota rápida..."
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-text-primary placeholder:text-text-muted"
        />
        <Button size="sm" onClick={handleSave} disabled={saving || draft.trim().length === 0}>
          Guardar
        </Button>
      </div>

      {notes === null && <p className="text-xs text-text-muted">Cargando notas...</p>}
      {notes !== null && notes.length === 0 && (
        <p className="text-xs text-text-muted">Todavía no tienes notas en este curso.</p>
      )}
      {notes !== null && notes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-2 rounded-md border border-border p-2 text-xs text-text-secondary"
            >
              <span className="whitespace-pre-wrap">{note.body}</span>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="shrink-0 text-text-muted hover:text-danger"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
