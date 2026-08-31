import Database from 'better-sqlite3'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'
import type { EmbeddingProvider } from '../../../src/shared/types/ai'

const FIXTURE = join(__dirname, '../../fixtures/sample.pdf')
let documentsDir: string

vi.mock('../../../src/main/filesystem/paths', () => ({
  paths: {
    documents: () => documentsDir
  }
}))

/**
 * Real model inference isn't reachable in this test environment (no
 * network — see DECISIONS.md ADR-012), and isn't the point of this test
 * anyway: this exercises the queue's own orchestration (extract -> ready ->
 * chunk -> embed), not embedding quality. A fixed-vector fake stands in.
 */
function fakeEmbeddingProvider(): EmbeddingProvider {
  return {
    id: 'fake',
    dimensions: 4,
    embed: async (texts) => texts.map(() => [1, 0, 0, 0])
  }
}

function failingEmbeddingProvider(): EmbeddingProvider {
  return {
    id: 'fake-failing',
    dimensions: 4,
    embed: async () => {
      throw new Error('Forbidden access to file: config.json')
    }
  }
}

describe('DocumentProcessingQueue', () => {
  let db: Database.Database
  let documents: DocumentRepository
  let chunks: DocumentChunkRepository

  beforeEach(() => {
    documentsDir = mkdtempSync(join(tmpdir(), 'studyos-queue-'))
    db = new Database(':memory:')
    runMigrations(db)
    documents = new DocumentRepository(db)
    chunks = new DocumentChunkRepository(db)
  })

  afterEach(() => {
    rmSync(documentsDir, { recursive: true, force: true })
  })

  function createSampleDocument(): { id: string } {
    const document = documents.create({
      title: 'sample',
      originalFilename: 'sample.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h1'
    })
    mkdirSync(join(documentsDir, document.id), { recursive: true })
    copyFileSync(FIXTURE, join(documentsDir, document.id, 'original.pdf'))
    return document
  }

  it('processes an enqueued document end to end: extract -> ready -> chunk -> embed -> indexed', async () => {
    const { DocumentProcessingQueue } =
      await import('../../../src/main/jobs/documentProcessingQueue')

    const document = createSampleDocument()
    const queue = new DocumentProcessingQueue(db, fakeEmbeddingProvider())
    const events: { stage: string; progress: number }[] = []
    queue.onProgress((event) => events.push({ stage: event.stage, progress: event.progress }))

    queue.enqueueExtraction(document.id)
    await vi.waitFor(() => {
      expect(events.filter((e) => e.stage === 'ready')).toHaveLength(2)
    })

    const updated = documents.getById(document.id)
    expect(updated?.status).toBe('ready')
    expect(updated?.pageCount).toBe(3)
    expect(documents.getPages(document.id)).toHaveLength(3)

    // The document becomes usable right after extraction (first 'ready'),
    // before indexing (chunk/embed) even starts — see DECISIONS.md ADR-013.
    const firstReadyIndex = events.findIndex((e) => e.stage === 'ready')
    expect(events[0]).toEqual({ stage: 'extracting', progress: 0 })
    expect(events[firstReadyIndex + 1].stage).toBe('chunking')
    expect(events.at(-1)).toEqual({ stage: 'ready', progress: 100 })

    const storedChunks = chunks.getEmbeddedChunks([document.id])
    expect(storedChunks.length).toBeGreaterThan(0)
    expect(Array.from(storedChunks[0].embedding)).toEqual([1, 0, 0, 0])
  })

  it('keeps the document ready and viewable when indexing fails (e.g. no network)', async () => {
    const { DocumentProcessingQueue } =
      await import('../../../src/main/jobs/documentProcessingQueue')

    const document = createSampleDocument()
    const queue = new DocumentProcessingQueue(db, failingEmbeddingProvider())
    const events: { stage: string; errorMessage?: string }[] = []
    queue.onProgress((event) =>
      events.push({ stage: event.stage, errorMessage: event.errorMessage })
    )

    queue.enqueueExtraction(document.id)
    await vi.waitFor(() => {
      expect(events.some((e) => e.errorMessage)).toBe(true)
    })

    // Extraction succeeded, so the document stays usable — NOT `failed`,
    // even though indexing never completed.
    expect(documents.getById(document.id)?.status).toBe('ready')
    expect(chunks.getEmbeddedChunks([document.id])).toEqual([])
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

    const queue = new DocumentProcessingQueue(db, fakeEmbeddingProvider())
    queue.reconcileOrphanedJobs()

    expect(documents.getById(document.id)?.status).toBe('failed')
  })

  it('reconcileOrphanedJobs does not revert an already-ready document just because indexing never finished', async () => {
    const { DocumentProcessingQueue } =
      await import('../../../src/main/jobs/documentProcessingQueue')

    const document = documents.create({
      title: 'sample',
      originalFilename: 'sample.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h1'
    })
    documents.updateStatus(document.id, 'ready', 3)
    new ProcessingJobRepository(db).create('document_extraction', document.id)

    const queue = new DocumentProcessingQueue(db, fakeEmbeddingProvider())
    queue.reconcileOrphanedJobs()

    expect(documents.getById(document.id)?.status).toBe('ready')
  })
})
