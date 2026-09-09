import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'
import { getDocumentHealth, listDocumentHealth } from '../../../src/main/diagnostics/documentHealth'

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

function createDoc(): { id: string } {
  return documents.create({
    title: 'Doc',
    originalFilename: 'doc.pdf',
    mimeType: 'application/pdf',
    fileHash: Math.random().toString()
  })
}

describe('getDocumentHealth', () => {
  it('returns null for an unknown document', () => {
    expect(getDocumentHealth(documents, chunks, jobs, 'nope')).toBeNull()
  })

  it('reports "complete" once a job succeeded cleanly, with the real chunk count', () => {
    const document = createDoc()
    documents.updateStatus(document.id, 'ready', 3)
    const job = jobs.create('document_extraction', document.id)
    jobs.updateProgress(job.id, 'succeeded', 100)
    chunks.replaceChunks(document.id, [
      { text: 'a', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0] },
      { text: 'b', pageStart: 2, pageEnd: 2, heading: null, tokenCount: 1, embedding: [0, 1] }
    ])

    const health = getDocumentHealth(documents, chunks, jobs, document.id)
    expect(health).toMatchObject({
      textExtraction: 'complete',
      chunks: 2,
      embeddingsComplete: 2,
      embeddingsTotal: 2,
      processingStatus: 'complete',
      lastError: null
    })
  })

  it('reports "partial" for ADR-013\'s soft-failure case: succeeded job, indexing error recorded', () => {
    const document = createDoc()
    documents.updateStatus(document.id, 'ready', 1)
    const job = jobs.create('document_extraction', document.id)
    jobs.updateProgress(job.id, 'succeeded', 100)
    jobs.recordSoftFailure(job.id, 'INDEXING_FAILED', 'sin conexión')

    const health = getDocumentHealth(documents, chunks, jobs, document.id)
    expect(health?.processingStatus).toBe('partial')
    expect(health?.lastError).toEqual({
      stage: 'unknown',
      code: 'INDEXING_FAILED',
      message: 'sin conexión'
    })
  })

  it('reports "processing" while the job is still active', () => {
    const document = createDoc()
    jobs.create('document_extraction', document.id)

    expect(getDocumentHealth(documents, chunks, jobs, document.id)?.processingStatus).toBe(
      'processing'
    )
  })

  it('reports "failed" when the job itself failed', () => {
    const document = createDoc()
    const job = jobs.create('document_extraction', document.id)
    jobs.markFailed(job.id, 'EXTRACTION_FAILED', 'PDF corrupto')

    const health = getDocumentHealth(documents, chunks, jobs, document.id)
    expect(health?.processingStatus).toBe('failed')
    expect(health?.lastError).toEqual({
      stage: 'unknown',
      code: 'EXTRACTION_FAILED',
      message: 'PDF corrupto'
    })
  })
})

describe('listDocumentHealth', () => {
  it('lists every document, newest first, each with its own health', () => {
    const first = createDoc()
    const second = createDoc()

    const list = listDocumentHealth(documents, chunks, jobs)
    expect(list.map((h) => h.documentId)).toEqual([second.id, first.id])
  })

  it('returns an empty list for an empty library', () => {
    expect(listDocumentHealth(documents, chunks, jobs)).toEqual([])
  })
})
