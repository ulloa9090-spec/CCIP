import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type {
  DocumentOutlineItem,
  DocumentPage,
  DocumentStatus,
  LibraryDocument
} from '../../../shared/types/documents'

interface DocumentRow {
  id: string
  title: string
  original_filename: string
  local_path: string
  mime_type: string
  page_count: number | null
  status: DocumentStatus
  file_hash: string
  created_at: string
  updated_at: string
}

interface DocumentPageRow {
  page_number: number
  text: string
  heading: string | null
}

function mapDocument(row: DocumentRow): LibraryDocument {
  return {
    id: row.id,
    title: row.title,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    pageCount: row.page_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export interface CreateDocumentInput {
  title: string
  originalFilename: string
  mimeType: string
  fileHash: string
}

export class DocumentRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateDocumentInput): LibraryDocument {
    const now = new Date().toISOString()
    const id = ulid()
    // local_path is deterministic from the id (documentStorage.ts's layout),
    // so it's derived here rather than passed in — no chicken-and-egg with
    // the id this method itself generates.
    const localPath = `documents/${id}/original.pdf`
    this.db
      .prepare(
        `INSERT INTO documents
           (id, title, original_filename, local_path, mime_type, page_count, status, file_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, 'imported', ?, ?, ?)`
      )
      .run(
        id,
        input.title,
        input.originalFilename,
        localPath,
        input.mimeType,
        input.fileHash,
        now,
        now
      )

    return {
      id,
      title: input.title,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      pageCount: null,
      status: 'imported',
      createdAt: now,
      updatedAt: now
    }
  }

  findByHash(fileHash: string): LibraryDocument | null {
    const row = this.db.prepare('SELECT * FROM documents WHERE file_hash = ?').get(fileHash) as
      DocumentRow | undefined
    return row ? mapDocument(row) : null
  }

  getById(id: string): LibraryDocument | null {
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as
      DocumentRow | undefined
    return row ? mapDocument(row) : null
  }

  list(): LibraryDocument[] {
    // `id DESC` breaks ties for rows created within the same millisecond
    // (created_at's resolution) — correct only because ids come from the
    // monotonic ulid factory (../ulid.ts), not a plain `ulid()` call.
    const rows = this.db
      .prepare('SELECT * FROM documents ORDER BY created_at DESC, id DESC')
      .all() as DocumentRow[]
    return rows.map(mapDocument)
  }

  updateStatus(id: string, status: DocumentStatus, pageCount?: number): void {
    const now = new Date().toISOString()
    if (pageCount === undefined) {
      this.db
        .prepare('UPDATE documents SET status = ?, updated_at = ? WHERE id = ?')
        .run(status, now, id)
    } else {
      this.db
        .prepare('UPDATE documents SET status = ?, page_count = ?, updated_at = ? WHERE id = ?')
        .run(status, pageCount, now, id)
    }
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  }

  replacePages(documentId: string, pages: DocumentPage[]): void {
    const replace = this.db.transaction(() => {
      this.db.prepare('DELETE FROM document_pages WHERE document_id = ?').run(documentId)
      const insert = this.db.prepare(
        'INSERT INTO document_pages (id, document_id, page_number, text, heading, metadata_json) VALUES (?, ?, ?, ?, ?, NULL)'
      )
      for (const page of pages) {
        insert.run(ulid(), documentId, page.pageNumber, page.text, page.heading)
      }
    })
    replace()
  }

  getPages(documentId: string): DocumentPage[] {
    const rows = this.db
      .prepare(
        'SELECT page_number, text, heading FROM document_pages WHERE document_id = ? ORDER BY page_number ASC'
      )
      .all(documentId) as DocumentPageRow[]
    return rows.map((row) => ({
      pageNumber: row.page_number,
      text: row.text,
      heading: row.heading
    }))
  }

  getOutline(documentId: string): DocumentOutlineItem[] {
    const rows = this.db
      .prepare(
        'SELECT page_number, heading FROM document_pages WHERE document_id = ? AND heading IS NOT NULL ORDER BY page_number ASC'
      )
      .all(documentId) as { page_number: number; heading: string }[]
    return rows.map((row) => ({ pageNumber: row.page_number, title: row.heading }))
  }
}
