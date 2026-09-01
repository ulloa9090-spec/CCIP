import { describe, expect, it } from 'vitest'
import { buildNotesMarkdown } from '../../../src/main/notes/notesExport'
import type { NoteWithCourseTitle } from '../../../src/shared/types/notes'

function note(overrides: Partial<NoteWithCourseTitle>): NoteWithCourseTitle {
  return {
    id: 'n1',
    title: null,
    body: 'Cuerpo de la nota',
    documentId: null,
    pageNumber: null,
    courseId: null,
    courseTitle: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('buildNotesMarkdown', () => {
  it('returns a placeholder document when there are no notes', () => {
    const markdown = buildNotesMarkdown([])
    expect(markdown).toContain('Todavía no tienes notas.')
  })

  it('groups notes under a heading per course', () => {
    const markdown = buildNotesMarkdown([
      note({ id: 'a', courseId: 'c1', courseTitle: 'Curso A', body: 'Nota A' }),
      note({ id: 'b', courseId: 'c2', courseTitle: 'Curso B', body: 'Nota B' })
    ])

    expect(markdown).toContain('## Curso A')
    expect(markdown).toContain('Nota A')
    expect(markdown).toContain('## Curso B')
    expect(markdown).toContain('Nota B')
  })

  it('falls back to "Sin curso" for notes with no course', () => {
    const markdown = buildNotesMarkdown([note({ courseId: null, courseTitle: null })])
    expect(markdown).toContain('## Sin curso')
  })

  it('groups multiple notes from the same course under one heading', () => {
    const markdown = buildNotesMarkdown([
      note({ id: 'a', courseId: 'c1', courseTitle: 'Curso A', body: 'Primera' }),
      note({ id: 'b', courseId: 'c1', courseTitle: 'Curso A', body: 'Segunda' })
    ])

    expect(markdown.match(/## Curso A/g)).toHaveLength(1)
    expect(markdown).toContain('Primera')
    expect(markdown).toContain('Segunda')
  })

  it('uses the note title when present, and a formatted date otherwise', () => {
    const withTitle = buildNotesMarkdown([note({ title: 'Mi título' })])
    expect(withTitle).toContain('### Mi título')

    const withoutTitle = buildNotesMarkdown([note({ title: null })])
    expect(withoutTitle).toMatch(/### \d/)
  })
})
