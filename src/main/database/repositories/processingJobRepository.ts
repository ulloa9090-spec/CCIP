import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'

export type ProcessingJobStatus = 'queued' | 'processing' | 'succeeded' | 'failed'

export interface ProcessingJob {
  id: string
  jobType: string
  documentId: string | null
  status: ProcessingJobStatus
  progress: number
  /** Fase 13: current pipeline stage (e.g. 'extracting', 'chunking', 'embedding'), informational only. */
  stage: string | null
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

interface ProcessingJobRow {
  id: string
  job_type: string
  document_id: string | null
  status: ProcessingJobStatus
  progress: number
  stage: string | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

function mapJob(row: ProcessingJobRow): ProcessingJob {
  return {
    id: row.id,
    jobType: row.job_type,
    documentId: row.document_id,
    status: row.status,
    progress: row.progress,
    stage: row.stage,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * Backs the in-process background queue (ARCHITECTURE.md §11) so a job's
 * status/progress survives a restart and the UI can reflect it without
 * polling the filesystem.
 */
export class ProcessingJobRepository {
  constructor(private readonly db: Database) {}

  create(jobType: string, documentId: string | null): ProcessingJob {
    const now = new Date().toISOString()
    const id = ulid()
    this.db
      .prepare(
        `INSERT INTO processing_jobs (id, job_type, document_id, status, progress, created_at, updated_at)
         VALUES (?, ?, ?, 'queued', 0, ?, ?)`
      )
      .run(id, jobType, documentId, now, now)
    return {
      id,
      jobType,
      documentId,
      status: 'queued',
      progress: 0,
      stage: null,
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    }
  }

  updateProgress(id: string, status: ProcessingJobStatus, progress: number): void {
    this.db
      .prepare('UPDATE processing_jobs SET status = ?, progress = ?, updated_at = ? WHERE id = ?')
      .run(status, progress, new Date().toISOString(), id)
  }

  /** Fase 13: informational pipeline stage, never touches `status`/`progress`. */
  setStage(id: string, stage: string): void {
    this.db
      .prepare('UPDATE processing_jobs SET stage = ?, updated_at = ? WHERE id = ?')
      .run(stage, new Date().toISOString(), id)
  }

  markFailed(id: string, errorCode: string, errorMessage: string): void {
    this.db
      .prepare(
        `UPDATE processing_jobs
         SET status = 'failed', error_code = ?, error_message = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(errorCode, errorMessage, new Date().toISOString(), id)
  }

  /**
   * Fase 13 / ADR-013: records an indexing failure's message for later
   * inspection WITHOUT touching `status` — the job still reports
   * `succeeded` (the document stays `ready`/usable) exactly as before this
   * phase. Only `documentProcessingQueue.ts`'s soft-failure path calls this.
   */
  recordSoftFailure(id: string, errorCode: string, errorMessage: string): void {
    this.db
      .prepare(
        'UPDATE processing_jobs SET error_code = ?, error_message = ?, updated_at = ? WHERE id = ?'
      )
      .run(errorCode, errorMessage, new Date().toISOString(), id)
  }

  /** Jobs still `processing` at startup mean the app was killed mid-job. */
  findOrphaned(): ProcessingJob[] {
    const rows = this.db
      .prepare("SELECT * FROM processing_jobs WHERE status IN ('queued', 'processing')")
      .all() as ProcessingJobRow[]
    return rows.map(mapJob)
  }

  /** System Health's processing-queue card — currently active jobs, right now. */
  countActive(): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM processing_jobs WHERE status IN ('queued', 'processing')"
      )
      .get() as { count: number }
    return row.count
  }

  /** Document Processing Health — the most recent job for a given document, if any. */
  getLatestByDocument(documentId: string): ProcessingJob | null {
    const row = this.db
      .prepare(
        'SELECT * FROM processing_jobs WHERE document_id = ? ORDER BY created_at DESC, id DESC LIMIT 1'
      )
      .get(documentId) as ProcessingJobRow | undefined
    return row ? mapJob(row) : null
  }
}
