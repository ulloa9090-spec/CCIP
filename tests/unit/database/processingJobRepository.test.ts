import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'

let db: Database.Database
let jobs: ProcessingJobRepository
let documentId: string

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  jobs = new ProcessingJobRepository(db)
  documentId = new DocumentRepository(db).create({
    title: 'Doc',
    originalFilename: 'doc.pdf',
    mimeType: 'application/pdf',
    fileHash: 'h1'
  }).id
})

describe('ProcessingJobRepository', () => {
  it('creates a job as queued with 0 progress', () => {
    const job = jobs.create('document_extraction', documentId)
    expect(job.status).toBe('queued')
    expect(job.progress).toBe(0)
  })

  it('updateProgress advances status and progress', () => {
    const job = jobs.create('document_extraction', documentId)
    jobs.updateProgress(job.id, 'processing', 50)

    const row = db.prepare('SELECT status, progress FROM processing_jobs WHERE id = ?').get(job.id)
    expect(row).toEqual({ status: 'processing', progress: 50 })
  })

  it('markFailed records the error and excludes the job from orphaned lookups', () => {
    const job = jobs.create('document_extraction', documentId)
    jobs.updateProgress(job.id, 'processing', 10)

    jobs.markFailed(job.id, 'BOOM', 'algo salió mal')

    const row = db
      .prepare('SELECT status, error_code, error_message FROM processing_jobs WHERE id = ?')
      .get(job.id)
    expect(row).toEqual({ status: 'failed', error_code: 'BOOM', error_message: 'algo salió mal' })
    expect(jobs.findOrphaned()).toEqual([])
  })

  it('findOrphaned returns jobs still queued or processing', () => {
    const queued = jobs.create('document_extraction', documentId)
    const processing = jobs.create('document_extraction', documentId)
    jobs.updateProgress(processing.id, 'processing', 20)
    const succeeded = jobs.create('document_extraction', documentId)
    jobs.updateProgress(succeeded.id, 'succeeded', 100)

    const orphaned = jobs.findOrphaned().map((j) => j.id)
    expect(orphaned.sort()).toEqual([queued.id, processing.id].sort())
  })
})
