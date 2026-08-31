import type { Database } from 'better-sqlite3'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { ProcessingJobRepository } from '../database/repositories/processingJobRepository'
import { extractPdf } from '../pdf/extractPdf'
import { originalPdfPath } from '../filesystem/documentStorage'
import { logger } from '../logging/logger'
import type { DocumentProgressEvent } from '../../shared/types/documents'

type ProgressListener = (event: DocumentProgressEvent) => void

/**
 * Single-concurrency, in-process FIFO queue (ARCHITECTURE.md §11 — no
 * external infrastructure). One job at a time is enough for a personal
 * library: PDF extraction is the only queued work in Fase 2, and running it
 * one document at a time keeps memory bounded and progress reporting simple.
 */
export class DocumentProcessingQueue {
  private readonly documents: DocumentRepository
  private readonly jobs: ProcessingJobRepository
  private readonly pending: string[] = []
  private processing = false
  private listener: ProgressListener | null = null

  constructor(db: Database) {
    this.documents = new DocumentRepository(db)
    this.jobs = new ProcessingJobRepository(db)
  }

  onProgress(listener: ProgressListener): void {
    this.listener = listener
  }

  private emit(event: DocumentProgressEvent): void {
    this.listener?.(event)
  }

  enqueueExtraction(documentId: string): void {
    this.jobs.create('document_extraction', documentId)
    this.pending.push(documentId)
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
        if (document && document.status !== 'ready') {
          this.documents.updateStatus(job.documentId, 'failed')
        }
      }
    }
  }

  private async drain(): Promise<void> {
    if (this.processing) return
    this.processing = true
    try {
      let documentId: string | undefined
      while ((documentId = this.pending.shift())) {
        await this.processOne(documentId)
      }
    } finally {
      this.processing = false
    }
  }

  private async processOne(documentId: string): Promise<void> {
    const document = this.documents.getById(documentId)
    if (!document) return

    this.documents.updateStatus(documentId, 'extracting')
    this.emit({ documentId, status: 'extracting', progress: 0 })

    try {
      const extracted = await extractPdf(originalPdfPath(documentId), (pageNumber, totalPages) => {
        const progress = Math.round((pageNumber / totalPages) * 100)
        this.emit({ documentId, status: 'extracting', progress })
      })

      this.documents.replacePages(documentId, extracted.pages)
      this.documents.updateStatus(documentId, 'ready', extracted.pageCount)
      this.emit({ documentId, status: 'ready', progress: 100 })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido al procesar el PDF.'
      logger.error('Document extraction failed', { documentId, message })
      this.documents.updateStatus(documentId, 'failed')
      this.emit({ documentId, status: 'failed', progress: 0, errorMessage: message })
    }
  }
}
