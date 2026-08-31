import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'

let db: Database.Database
let documents: DocumentRepository
let chunks: DocumentChunkRepository
let documentId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  documents = new DocumentRepository(db)
  chunks = new DocumentChunkRepository(db)
  documentId = documents.create({
    title: 'Michigan Builder Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
})

describe('DocumentChunkRepository', () => {
  it('round-trips embeddings through the BLOB column without precision loss', () => {
    const embedding = [0.1, -0.2, 0.3, 1, -1, 0]
    chunks.replaceChunks(documentId, [
      {
        text: 'chunk text',
        pageStart: 1,
        pageEnd: 2,
        heading: 'Concrete',
        tokenCount: 10,
        embedding
      }
    ])

    const [stored] = chunks.getEmbeddedChunks([documentId])
    expect(stored.documentTitle).toBe('Michigan Builder Manual')
    expect(stored.pageStart).toBe(1)
    expect(stored.pageEnd).toBe(2)
    expect(stored.heading).toBe('Concrete')
    // Float32 round-trip: compare with tolerance, not exact equality.
    Array.from(stored.embedding).forEach((value, i) => {
      expect(value).toBeCloseTo(embedding[i], 5)
    })
  })

  it('replaceChunks clears previous chunks for the document (reindex is idempotent)', () => {
    chunks.replaceChunks(documentId, [
      { text: 'v1', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])
    chunks.replaceChunks(documentId, [
      { text: 'v2-a', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] },
      { text: 'v2-b', pageStart: 2, pageEnd: 2, heading: null, tokenCount: 1, embedding: [0, 1] }
    ])

    expect(chunks.countByDocument(documentId)).toBe(2)
  })

  it('getEmbeddedChunks scopes to the given document ids', () => {
    const otherDocId = documents.create({
      title: 'Other',
      originalFilename: 'other.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h2'
    }).id

    chunks.replaceChunks(documentId, [
      { text: 'a', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])
    chunks.replaceChunks(otherDocId, [
      { text: 'b', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [0, 1] }
    ])

    expect(chunks.getEmbeddedChunks([documentId])).toHaveLength(1)
    expect(chunks.getEmbeddedChunks()).toHaveLength(2)
  })

  it('deleting the document cascades to its chunks', () => {
    chunks.replaceChunks(documentId, [
      { text: 'a', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])
    documents.delete(documentId)

    expect(chunks.getEmbeddedChunks([documentId])).toEqual([])
  })
})
