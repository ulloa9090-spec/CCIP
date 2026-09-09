import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'
import { classifyEmptyRetrievalReason } from '../../../src/main/diagnostics/abstentionClassifier'

let db: Database.Database
let documents: DocumentRepository
let chunks: DocumentChunkRepository
let jobs: ProcessingJobRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  documents = new DocumentRepository(db)
  chunks = new DocumentChunkRepository(db)
  jobs = new ProcessingJobRepository(db)
})

describe('classifyEmptyRetrievalReason', () => {
  it('NO_INDEXED_DOCUMENTS when the library has no documents at all', () => {
    expect(classifyEmptyRetrievalReason(documents, chunks, jobs)).toBe('NO_INDEXED_DOCUMENTS')
  })

  it('DOCUMENT_PROCESSING_INCOMPLETE when documents exist, no chunks yet, and a job is still active', () => {
    const document = documents.create({
      title: 'D',
      originalFilename: 'd.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h'
    })
    jobs.create('document_extraction', document.id)

    expect(classifyEmptyRetrievalReason(documents, chunks, jobs)).toBe(
      'DOCUMENT_PROCESSING_INCOMPLETE'
    )
  })

  it('NO_EMBEDDINGS when documents exist, no chunks, and nothing is currently processing', () => {
    documents.create({
      title: 'D',
      originalFilename: 'd.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h'
    })

    expect(classifyEmptyRetrievalReason(documents, chunks, jobs)).toBe('NO_EMBEDDINGS')
  })

  it('NO_RETRIEVAL_RESULTS when the library is fully indexed (caller already knows results.length === 0)', () => {
    const document = documents.create({
      title: 'D',
      originalFilename: 'd.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h'
    })
    chunks.replaceChunks(document.id, [
      { text: 'x', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] }
    ])

    expect(classifyEmptyRetrievalReason(documents, chunks, jobs)).toBe('NO_RETRIEVAL_RESULTS')
  })
})
