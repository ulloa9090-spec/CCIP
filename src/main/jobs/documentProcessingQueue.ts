import type { Database } from 'better-sqlite3'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import { ProcessingJobRepository } from '../database/repositories/processingJobRepository'
import { extractPdf } from '../pdf/extractPdf'
import { originalPdfPath } from '../filesystem/documentStorage'
import { chunkPages } from '../retrieval/chunkPages'
import { LocalEmbeddingProvider } from '../ai/localEmbeddingProvider'
import { logger } from '../logging/logger'
import type { DocumentProgressEvent } from '../../shared/types/documents'
import type { EmbeddingProvider } from '../../shared/types/ai'

type ProgressListener = (event: DocumentProgressEvent) => void

const EMBEDDING_BATCH_SIZE = 8

interface PendingJob {
  jobId: string
  documentId: string
}

/**
 * Single-concurrency, in-process FIFO queue (ARCHITECTURE.md §11 — no
 * external infrastructure). Pipeline per document: extract -> ready, then
 * chunk -> embed as a best-effort follow-up (ARCHITECTURE.md §10).
 *
 * Indexing failure (e.g. no network for the embedding model's first
 * download) never reverts an already-extracted document to `failed` — it
 * stays `ready`/viewable, just not searchable yet, until "Reindexar" retries
 * indexing. See DECISIONS.md ADR-013.
 */
export class DocumentProcessingQueue {
  private readonly documents: DocumentRepository
  private readonly chunks: DocumentChunkRepository
  private readonly jobs: ProcessingJobRepository
  private readonly embeddings: EmbeddingProvider
  private readonly pending: PendingJob[] = []
  private processing = false
  private listener: ProgressListener | null = null

  constructor(db: Database, embeddings: EmbeddingProvider = new LocalEmbeddingProvider()) {
    this.documents = new DocumentRepository(db)
    this.chunks = new DocumentChunkRepository(db)
    this.jobs = new ProcessingJobRepository(db)
    this.embeddings = embeddings
  }

  onProgress(listener: ProgressListener): void {
    this.listener = listener
  }

  private emit(event: DocumentProgressEvent): void {
    this.listener?.(event)
  }

  enqueueExtraction(documentId: string): void {
    const job = this.jobs.create('document_extraction', documentId)
    this.pending.push({ jobId: job.id, documentId })
    void this.drain()
  }

  /** Jobs still `queued`/`processing` at startup mean the app was killed mid-job. */
  reconcileOrphanedJobs(): void {
    for (const job of this.jobs.findOrphaned()) {
      this.jobs.markFailed(
        job.id,
        'INTERRUPTED',
        'El procesamiento se interrumpió al cerrar la aplicación.'
      )
      if (job.documentId) {
        const document = this.documents.getById(job.documentId)
        // Only extraction ever leaves a document in a non-terminal state
        // (`extracting`); an interrupted indexing pass just leaves it
        // unindexed, still `ready` — see processOne().
        if (document && document.status === 'extracting') {
          this.documents.updateStatus(job.documentId, 'failed')
        }
      }
    }
  }

  private async drain(): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      let job: PendingJob | undefined
      while ((job = this.pending.shift())) {
        await this.processOne(job)
      }
    } finally {
      this.processing = false
    }
  }

  private async processOne({ jobId, documentId }: PendingJob): Promise<void> {
    const document = this.documents.getById(documentId)
    if (!document) return

    this.jobs.updateProgress(jobId, 'processing', 0)

    let extractedPages
    try {
      this.documents.updateStatus(documentId, 'extracting')
      this.emit({ documentId, stage: 'extracting', progress: 0 })

      const extracted = await extractPdf(originalPdfPath(documentId), (pageNumber, totalPages) => {
        const progress = Math.round((pageNumber / totalPages) * 100)
        this.jobs.updateProgress(jobId, 'processing', progress)
        this.emit({ documentId, stage: 'extracting', progress })
      })
      this.documents.replacePages(documentId, extracted.pages)
      extractedPages = extracted.pages

      // The document is usable from here on regardless of what happens next.
      this.documents.updateStatus(documentId, 'ready', extracted.pageCount)
      this.emit({ documentId, stage: 'ready', progress: 100 })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido al procesar el PDF.'
      logger.error('Document extraction failed', { documentId, message })
      this.documents.updateStatus(documentId, 'failed')
      this.jobs.markFailed(jobId, 'EXTRACTION_FAILED', message)
      this.emit({ documentId, stage: 'failed', progress: 0, errorMessage: message })
      return
    }

    try {
      this.emit({ documentId, stage: 'chunking', progress: 0 })
      const drafts = chunkPages(extractedPages)
      this.emit({ documentId, stage: 'chunking', progress: 100 })

      this.emit({ documentId, stage: 'embedding', progress: 0 })
      const withEmbeddings = await this.embedInBatches(documentId, drafts)
      this.chunks.replaceChunks(documentId, withEmbeddings)

      this.jobs.updateProgress(jobId, 'succeeded', 100)
      this.emit({ documentId, stage: 'ready', progress: 100 })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido al indexar el documento.'
      logger.error('Document indexing failed (document remains viewable)', {
        documentId,
        message
      })
      // The extraction job itself still succeeded — indexing is tracked as
      // a soft failure via the event, not a document- or job-level failure.
      this.jobs.updateProgress(jobId, 'succeeded', 100)
      this.emit({ documentId, stage: 'ready', progress: 100, errorMessage: message })
    }
  }

  private async embedInBatches(
    documentId: string,
    drafts: ReturnType<typeof chunkPages>
  ): Promise<(ReturnType<typeof chunkPages>[number] & { embedding: number[] })[]> {
    if (drafts.length === 0) return []

    const results: (ReturnType<typeof chunkPages>[number] & { embedding: number[] })[] = []
    for (let i = 0; i < drafts.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = drafts.slice(i, i + EMBEDDING_BATCH_SIZE)
      const embeddings = await this.embeddings.embed(batch.map((chunk) => chunk.text))
      batch.forEach((chunk, index) => results.push({ ...chunk, embedding: embeddings[index] }))

      const progress = Math.round((results.length / drafts.length) * 100)
      this.emit({ documentId, stage: 'embedding', progress })
    }
    return results
  }
}
