import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import type { LibraryDocument } from '../../../src/shared/types/documents'

let db: Database.Database
let repository: DocumentRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  repository = new DocumentRepository(db)
})

function create(fileHash = 'hash-1'): LibraryDocument {
  return repository.create({
    title: 'Michigan Builder Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash
  })
}

describe('DocumentRepository', () => {
  it('creates a document with a deterministic local_path derived from its id', () => {
    const document = create()
    const row = db.prepare('SELECT local_path FROM documents WHERE id = ?').get(document.id) as {
      local_path: string
    }
    expect(row.local_path).toBe(`documents/${document.id}/original.pdf`)
    expect(document.status).toBe('imported')
    expect(document.pageCount).toBeNull()
  })

  it('findByHash returns the existing document instead of creating a duplicate', () => {
    const first = create('same-hash')
    const found = repository.findByHash('same-hash')
    expect(found).toEqual(first)
  })

  it('list orders by created_at descending', () => {
    const a = create('hash-a')
    const b = create('hash-b')
    const ids = repository.list().map((d) => d.id)
    expect(ids).toEqual([b.id, a.id])
  })

  it('updateStatus sets page_count only when provided', () => {
    const document = create()
    repository.updateStatus(document.id, 'extracting')
    expect(repository.getById(document.id)?.pageCount).toBeNull()

    repository.updateStatus(document.id, 'ready', 42)
    expect(repository.getById(document.id)?.pageCount).toBe(42)
    expect(repository.getById(document.id)?.status).toBe('ready')
  })

  it('deleting a document cascades to its pages', () => {
    const document = create()
    repository.replacePages(document.id, [{ pageNumber: 1, text: 'hola', heading: null }])

    repository.delete(document.id)

    expect(repository.getById(document.id)).toBeNull()
    expect(repository.getPages(document.id)).toEqual([])
  })

  it('replacePages is idempotent — reindexing does not duplicate rows', () => {
    const document = create()
    repository.replacePages(document.id, [{ pageNumber: 1, text: 'v1', heading: null }])
    repository.replacePages(document.id, [
      { pageNumber: 1, text: 'v2', heading: 'Intro' },
      { pageNumber: 2, text: 'v2 page 2', heading: null }
    ])

    const pages = repository.getPages(document.id)
    expect(pages).toEqual([
      { pageNumber: 1, text: 'v2', heading: 'Intro' },
      { pageNumber: 2, text: 'v2 page 2', heading: null }
    ])
  })

  it('getOutline returns only pages with a heading, ordered by page number', () => {
    const document = create()
    repository.replacePages(document.id, [
      { pageNumber: 1, text: 'a', heading: 'Concrete' },
      { pageNumber: 2, text: 'b', heading: null },
      { pageNumber: 3, text: 'c', heading: 'Framing' }
    ])

    expect(repository.getOutline(document.id)).toEqual([
      { pageNumber: 1, title: 'Concrete' },
      { pageNumber: 3, title: 'Framing' }
    ])
  })
})
