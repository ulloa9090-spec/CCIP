import type { DocumentRepository } from '../database/repositories/documentRepository'
import type { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import type {
  ProcessingJob,
  ProcessingJobRepository
} from '../database/repositories/processingJobRepository'
import type { DocumentHealth } from '../../shared/types/diagnostics'

function processingStatus(
  job: ProcessingJob | null,
  chunkCount: number
): DocumentHealth['processingStatus'] {
  if (!job) return chunkCount > 0 ? 'complete' : 'failed'
  if (job.status === 'queued' || job.status === 'processing') return 'processing'
  if (job.status === 'failed') return 'failed'
  // 'succeeded' with an error message is exactly ADR-013's soft-failure
  // case: extraction finished (document usable) but indexing didn't.
  return job.errorMessage ? 'partial' : 'complete'
}

function durationMs(job: ProcessingJob | null): number | null {
  if (!job) return null
  return new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()
}

/**
 * Fase 13's Document Processing Health view — one row per document,
 * explaining *why* a document isn't searchable instead of leaving indexing
 * failures as a transient toast the user already missed (ADR-013 / ADR-024).
 *
 * `embeddingsComplete`/`embeddingsTotal` are both just the chunk count: the
 * current pipeline (documentProcessingQueue.ts) only ever persists chunks
 * after every batch in a document embeds successfully (one all-or-nothing
 * `replaceChunks` call) — there is no real intermediate "N of M embedded"
 * state to report, so this never fabricates one.
 */
export function getDocumentHealth(
  documents: DocumentRepository,
  chunks: DocumentChunkRepository,
  jobs: ProcessingJobRepository,
  documentId: string
): DocumentHealth | null {
  const document = documents.getById(documentId)
  if (!document) return null

  const chunkCount = chunks.countByDocument(documentId)
  const job = jobs.getLatestByDocument(documentId)

  return {
    documentId: document.id,
    documentTitle: document.title,
    pages: document.pageCount ?? 0,
    textExtraction:
      document.status === 'ready'
        ? 'complete'
        : document.status === 'failed'
          ? 'failed'
          : 'pending',
    chunks: chunkCount,
    embeddingsComplete: chunkCount,
    embeddingsTotal: chunkCount,
    processingStatus: processingStatus(job, chunkCount),
    processingDurationMs: durationMs(job),
    lastError:
      job?.errorMessage != null
        ? {
            stage: job.stage ?? 'unknown',
            code: job.errorCode ?? 'UNKNOWN_ERROR',
            message: job.errorMessage
          }
        : null
  }
}

export function listDocumentHealth(
  documents: DocumentRepository,
  chunks: DocumentChunkRepository,
  jobs: ProcessingJobRepository
): DocumentHealth[] {
  return documents
    .list()
    .map((document) => getDocumentHealth(documents, chunks, jobs, document.id))
    .filter((health): health is DocumentHealth => health !== null)
}
