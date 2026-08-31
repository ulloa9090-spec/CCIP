import Database from 'better-sqlite3'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'

const FIXTURE = join(__dirname, '../../fixtures/sample.pdf')
let documentsDir: string

vi.mock('../../../src/main/filesystem/paths', () => ({
  paths: {
    documents: () => documentsDir
  }
}))

describe('DocumentProcessingQueue', () => {
  let db: Database.Database
  let documents: DocumentRepository

  beforeEach(() => {
    documentsDir = mkdtempSync(join(tmpdir(), 'studyos-queue-'))
    db = new Database(':memory:')
    runMigrations(db)
    documents = new DocumentRepository(db)
  })

  afterEach(() => {
    rmSync(documentsDir, { recursive: true, force: true })
  })

  it('processes an enqueued document end to end: extracting -> ready, with pages and progress events', async () => {
    const { DocumentProcessingQueue } =
      await import('../../../src/main/jobs/documentProcessingQueue')

    const document = documents.create({
      title: 'sample',
      originalFilename: 'sample.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h1'
    })
    mkdirSync(join(documentsDir, document.id), { recursive: true })
    copyFileSync(FIXTURE, join(documentsDir, document.id, 'original.pdf'))

    const queue = new DocumentProcessingQueue(db)
    const events: { status: string; progress: number }[] = []
    queue.onProgress((event) => events.push({ status: event.status, progress: event.progress }))

    queue.enqueueExtraction(document.id)
    // The queue drains asynchronously (real PDF parsing); wait for the
    // terminal event instead of a fixed timeout.
    await vi.waitFor(() => {
      expect(events.some((e) => e.status === 'ready')).toBe(true)
    })

    const updated = documents.getById(document.id)
    expect(updated?.status).toBe('ready')
    expect(updated?.pageCount).toBe(3)
    expect(documents.getPages(document.id)).toHaveLength(3)
    expect(events[0]).toEqual({ status: 'extracting', progress: 0 })
    expect(events.at(-1)).toEqual({ status: 'ready', progress: 100 })
  })

  it('reconcileOrphanedJobs marks interrupted jobs and their documents as failed', async () => {
    const { DocumentProcessingQueue } =
      await import('../../../src/main/jobs/documentProcessingQueue')

    const document = documents.create({
      title: 'sample',
      originalFilename: 'sample.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h1'
    })
    documents.updateStatus(document.id, 'extracting')
    new ProcessingJobRepository(db).create('document_extraction', document.id)

    const queue = new DocumentProcessingQueue(db)
    queue.reconcileOrphanedJobs()

    expect(documents.getById(document.id)?.status).toBe('failed')
  })
})
