import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type { CreateNoteInput, Note } from '../../../shared/types/notes'

interface NoteRow {
  id: string
  title: string | null
  body: string
  document_id: string | null
  page_number: number | null
  course_id: string | null
  created_at: string
  updated_at: string
}

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    documentId: row.document_id,
    pageNumber: row.page_number,
    courseId: row.course_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class NoteRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateNoteInput): Note {
    const now = new Date().toISOString()
    const id = ulid()
    this.db
      .prepare(
        `INSERT INTO notes (id, title, body, document_id, page_number, course_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.title ?? null,
        input.body,
        input.documentId ?? null,
        input.pageNumber ?? null,
        input.courseId ?? null,
        now,
        now
      )
    return {
      id,
      title: input.title ?? null,
      body: input.body,
      documentId: input.documentId ?? null,
      pageNumber: input.pageNumber ?? null,
      courseId: input.courseId ?? null,
      createdAt: now,
      updatedAt: now
    }
  }

  listByCourse(courseId: string): Note[] {
    const rows = this.db
      .prepare('SELECT * FROM notes WHERE course_id = ? ORDER BY created_at DESC, id DESC')
      .all(courseId) as NoteRow[]
    return rows.map(mapNote)
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  }
}
