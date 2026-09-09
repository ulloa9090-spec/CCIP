import type { DocumentRepository } from '../database/repositories/documentRepository'
import type { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import type { ProcessingJobRepository } from '../database/repositories/processingJobRepository'
import type { AbstentionReason } from '../../shared/types/diagnostics'

/**
 * Explains a zero-result retrieval (TutorService's Closed Library Mode
 * short-circuit) with the most specific reason the existing repositories can
 * actually support — never a guess. Every branch here reads real state:
 * "processing" vs. "stuck" is `ProcessingJobRepository.countActive()`, not
 * an invented timer. See docs/DECISIONS.md ADR-024.
 */
export function classifyEmptyRetrievalReason(
  documents: DocumentRepository,
  chunks: DocumentChunkRepository,
  jobs: ProcessingJobRepository
): AbstentionReason {
  if (documents.list().length === 0) return 'NO_INDEXED_DOCUMENTS'
  if (chunks.countAll() === 0) {
    return jobs.countActive() > 0 ? 'DOCUMENT_PROCESSING_INCOMPLETE' : 'NO_EMBEDDINGS'
  }
  return 'NO_RETRIEVAL_RESULTS'
}
