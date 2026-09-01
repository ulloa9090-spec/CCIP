import type { NoteWithCourseTitle } from '../../shared/types/notes'

const UNSCOPED_HEADING = 'Sin curso'

/**
 * Pure Markdown formatter for Fase 12's "Exportar notas" — kept separate
 * from the IPC handler so it's trivially unit-testable without touching the
 * filesystem or a save dialog. Groups notes by course (in the order their
 * most recent note appears, since `listAll()` is already sorted newest
 * first) so a user with several courses gets one section per course
 * instead of one flat chronological list.
 */
export function buildNotesMarkdown(notes: NoteWithCourseTitle[]): string {
  if (notes.length === 0) {
    return '# Notas de StudyOS\n\nTodavía no tienes notas.\n'
  }

  const sections = new Map<string, NoteWithCourseTitle[]>()
  for (const note of notes) {
    const heading = note.courseTitle ?? UNSCOPED_HEADING
    const existing = sections.get(heading)
    if (existing) existing.push(note)
    else sections.set(heading, [note])
  }

  const lines = ['# Notas de StudyOS', '']
  for (const [heading, courseNotes] of sections) {
    lines.push(`## ${heading}`, '')
    for (const note of courseNotes) {
      const title = note.title ?? new Date(note.createdAt).toLocaleDateString('es')
      lines.push(`### ${title}`, '', note.body, '')
    }
  }
  return lines.join('\n')
}
