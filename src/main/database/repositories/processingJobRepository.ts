import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'

export type ProcessingJobStatus = 'queued' | 'processing' | 'succeeded' | 'failed'

export interface ProcessingJob {
  id: string
  jobType: string
  documentId: string | null
  status: ProcessingJobStatus
  progress: number
}

interface ProcessingJobRow {
  id: string
  job_type: string
  document_id: string | null
  status: ProcessingJobStatus
  progress: number
}

function mapJob(row: ProcessingJobRow): ProcessingJob {
  return {
    id: row.id,
    jobType: row.job_type,
    documentId: row.document_id,
    status: row.status,
    progress: row.progress
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
    return { id, jobType, documentId, status: 'queued', progress: 0 }
  }

  updateProgress(id: string, status: ProcessingJobStatus, progress: number): void {
    this.db
      .prepare('UPDATE processing_jobs SET status = ?, progress = ?, updated_at = ? WHERE id = ?')
      .run(status, progress, new Date().toISOString(), id)
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

  /** Jobs still `processing` at startup mean the app was killed mid-job. */
  findOrphaned(): ProcessingJob[] {
    const rows = this.db
      .prepare("SELECT * FROM processing_jobs WHERE status IN ('queued', 'processing')")
      .all() as ProcessingJobRow[]
    return rows.map(mapJob)
  }
}
