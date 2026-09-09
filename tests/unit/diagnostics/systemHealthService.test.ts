import Database from 'better-sqlite3'
import { mkdirSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DiagnosticsRepository } from '../../../src/main/database/repositories/diagnosticsRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { ProcessingJobRepository } from '../../../src/main/database/repositories/processingJobRepository'
import type { SystemHealthService } from '../../../src/main/diagnostics/systemHealthService'
import type { EmbeddingProvider } from '../../../src/shared/types/ai'

let backupsDir: string

// Same pattern as tests/unit/security/secretStore.test.ts — safeStorage only
// exists inside a real Electron process.
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value, 'utf8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf8')
  }
}))

vi.mock('../../../src/main/filesystem/paths', () => ({
  paths: {
    secrets: () => backupsDir, // secretStore's key file lives alongside, doesn't matter for these tests
    backups: () => join(backupsDir, 'backups')
  }
}))

function fakeEmbeddings(): EmbeddingProvider {
  return { id: 'local-fake', dimensions: 4, embed: async () => [] }
}

describe('SystemHealthService', () => {
  let db: Database.Database
  let diagnostics: DiagnosticsRepository
  let chunks: DocumentChunkRepository
  let jobs: ProcessingJobRepository
  let documents: DocumentRepository

  beforeEach(async () => {
    vi.resetModules()
    backupsDir = mkdtempSync(join(tmpdir(), 'studyos-health-'))
    db = new Database(':memory:')
    runMigrations(db)
    diagnostics = new DiagnosticsRepository(db)
    chunks = new DocumentChunkRepository(db)
    jobs = new ProcessingJobRepository(db)
    documents = new DocumentRepository(db)
  })

  afterEach(() => {
    rmSync(backupsDir, { recursive: true, force: true })
  })

  async function buildService(): Promise<SystemHealthService> {
    const { SystemHealthService: Service } =
      await import('../../../src/main/diagnostics/systemHealthService')
    return new Service(db, diagnostics, chunks, jobs, fakeEmbeddings())
  }

  it('reports sqlite healthy with the real schema version and pdf.js as available', async () => {
    const service = await buildService()
    const health = service.getSystemHealth()

    expect(health.sqlite.status).toBe('healthy')
    expect(health.sqlite.databaseVersion).toBeGreaterThan(0)
    expect(health.documentEngine.status).toBe('healthy')
  })

  it('reports the real embedding provider identity, not a hardcoded string', async () => {
    const service = await buildService()
    const health = service.getSystemHealth()

    expect(health.embeddingEngine).toMatchObject({
      status: 'healthy',
      model: 'local-fake',
      dimensions: 4
    })
  })

  it('openAI: warning when unconfigured, unknown when configured but never tried, healthy/error after a real attempt', async () => {
    const secretStore = await import('../../../src/main/security/secretStore')

    let service = await buildService()
    expect(service.getSystemHealth().openAI).toMatchObject({ status: 'warning', configured: false })

    secretStore.setOpenAIKey('sk-test-1234567890')
    service = await buildService()
    expect(service.getSystemHealth().openAI).toMatchObject({ status: 'unknown', configured: true })

    diagnostics.recordUsage({
      requestId: null,
      feature: 'tutor',
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCost: null,
      status: 'success',
      errorCode: null,
      latencyMs: null,
      firstTokenMs: null
    })
    expect((await buildService()).getSystemHealth().openAI).toMatchObject({
      status: 'healthy',
      lastConnectionStatus: 'success'
    })

    diagnostics.recordUsage({
      requestId: null,
      feature: 'tutor',
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCost: null,
      status: 'error',
      errorCode: 'AI_CONNECTION_FAILED',
      latencyMs: null,
      firstTokenMs: null
    })
    expect((await buildService()).getSystemHealth().openAI).toMatchObject({
      status: 'error',
      lastConnectionStatus: 'error'
    })
  })

  it('retrieval: warning with zero chunks indexed, healthy once any exist', async () => {
    let service = await buildService()
    expect(service.getSystemHealth().retrieval).toMatchObject({
      status: 'warning',
      chunksIndexed: 0
    })

    const document = documents.create({
      title: 'D',
      originalFilename: 'd.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h'
    })
    chunks.replaceChunks(document.id, [
      { text: 'x', pageStart: 1, pageEnd: 1, heading: null, tokenCount: 1, embedding: [1, 0, 0, 0] }
    ])

    service = await buildService()
    expect(service.getSystemHealth().retrieval).toMatchObject({
      status: 'healthy',
      chunksIndexed: 1
    })
  })

  it('processingQueue reports the real count of currently active jobs', async () => {
    const document = documents.create({
      title: 'D',
      originalFilename: 'd.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h'
    })
    jobs.create('document_extraction', document.id)

    const service = await buildService()
    expect(service.getSystemHealth().processingQueue).toMatchObject({
      status: 'healthy',
      pendingJobs: 1
    })
  })

  it("lastBackup: warning with none, healthy with the most recent backup folder's real timestamp", async () => {
    let service = await buildService()
    expect(service.getSystemHealth().lastBackup).toMatchObject({
      status: 'warning',
      backedUpAt: null
    })

    mkdirSync(join(backupsDir, 'backups', 'backup-2024-01-01T00-00-00-000Z'), { recursive: true })

    service = await buildService()
    const lastBackup = service.getSystemHealth().lastBackup
    expect(lastBackup.status).toBe('healthy')
    expect(lastBackup.backedUpAt).not.toBeNull()
  })
})
