import { readdirSync, statSync } from 'fs'
import type { Database } from 'better-sqlite3'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { paths } from '../filesystem/paths'
import { getOpenAIKeyStatus } from '../security/secretStore'
import type { DiagnosticsRepository } from '../database/repositories/diagnosticsRepository'
import type { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import type { ProcessingJobRepository } from '../database/repositories/processingJobRepository'
import type { EmbeddingProvider } from '../../shared/types/ai'
import type { HealthCheck, SystemHealth } from '../../shared/types/diagnostics'

function latestBackupAt(): string | null {
  const dir = paths.backups()
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return null
  }
  let latest: number | null = null
  for (const entry of entries) {
    try {
      const stat = statSync(`${dir}/${entry}`)
      if (!stat.isDirectory()) continue
      if (latest === null || stat.mtimeMs > latest) latest = stat.mtimeMs
    } catch {
      // Entry vanished between readdir and stat — skip it, not a health failure.
    }
  }
  return latest === null ? null : new Date(latest).toISOString()
}

/**
 * Fase 13's System Health card (spec §5): a set of independent, real signals
 * — never a single "everything OK" boolean — so a broken piece is visible
 * at a glance instead of hiding behind a generic app crash. Every field
 * here reads existing state; this module never exercises the pipeline
 * (no live OpenAI call, no embedding run) just to populate a dashboard.
 */
export class SystemHealthService {
  constructor(
    private readonly db: Database,
    private readonly diagnostics: DiagnosticsRepository,
    private readonly chunks: DocumentChunkRepository,
    private readonly jobs: ProcessingJobRepository,
    private readonly embeddings: EmbeddingProvider
  ) {}

  getSystemHealth(): SystemHealth {
    return {
      sqlite: this.checkSqlite(),
      documentEngine: this.checkDocumentEngine(),
      embeddingEngine: this.checkEmbeddingEngine(),
      openAI: this.checkOpenAI(),
      retrieval: this.checkRetrieval(),
      processingQueue: this.checkProcessingQueue(),
      lastBackup: this.checkLastBackup()
    }
  }

  private checkSqlite(): HealthCheck & { databaseVersion: number } {
    try {
      const databaseVersion = this.db.pragma('user_version', { simple: true }) as number
      return { status: 'healthy', label: 'Base de datos local', detail: null, databaseVersion }
    } catch (error) {
      return {
        status: 'error',
        label: 'Base de datos local',
        detail: error instanceof Error ? error.message : 'No se pudo consultar la base de datos.',
        databaseVersion: -1
      }
    }
  }

  private checkDocumentEngine(): HealthCheck {
    // If this module loaded at all, pdf.js's own top-level module
    // initialization already succeeded — verifying `getDocument` is callable
    // is as far as this check can go without opening a real PDF.
    const available = typeof getDocument === 'function'
    return {
      status: available ? 'healthy' : 'error',
      label: 'Motor de extracción de PDF',
      detail: available ? null : 'pdf.js no está disponible.'
    }
  }

  private checkEmbeddingEngine(): HealthCheck & { model: string; dimensions: number | null } {
    return {
      status: 'healthy',
      label: 'Motor de embeddings local',
      detail: this.embeddings.id,
      model: this.embeddings.id,
      dimensions: this.embeddings.dimensions
    }
  }

  private checkOpenAI(): HealthCheck & {
    configured: boolean
    lastConnectionAt: string | null
    lastConnectionStatus: 'success' | 'error' | null
  } {
    const configured = getOpenAIKeyStatus().configured
    const lastConnection = this.diagnostics.getLastProviderConnection('openai')

    if (!configured) {
      return {
        status: 'warning',
        label: 'Proveedor de IA (OpenAI)',
        detail: 'No se ha configurado una clave de API.',
        configured: false,
        lastConnectionAt: null,
        lastConnectionStatus: null
      }
    }
    if (!lastConnection) {
      return {
        status: 'unknown',
        label: 'Proveedor de IA (OpenAI)',
        detail: 'Clave configurada; aún no se ha intentado una conexión real.',
        configured: true,
        lastConnectionAt: null,
        lastConnectionStatus: null
      }
    }
    return {
      status: lastConnection.status === 'success' ? 'healthy' : 'error',
      label: 'Proveedor de IA (OpenAI)',
      detail:
        lastConnection.status === 'success'
          ? null
          : 'El último intento de conexión con OpenAI falló.',
      configured: true,
      lastConnectionAt: lastConnection.at,
      lastConnectionStatus: lastConnection.status
    }
  }

  private checkRetrieval(): HealthCheck & { chunksIndexed: number } {
    const chunksIndexed = this.chunks.countAll()
    return {
      status: chunksIndexed > 0 ? 'healthy' : 'warning',
      label: 'Índice de recuperación',
      detail: chunksIndexed > 0 ? null : 'Aún no hay fragmentos indexados en la biblioteca.',
      chunksIndexed
    }
  }

  private checkProcessingQueue(): HealthCheck & { pendingJobs: number } {
    const pendingJobs = this.jobs.countActive()
    return {
      status: 'healthy',
      label: 'Cola de procesamiento',
      detail: pendingJobs > 0 ? `${pendingJobs} trabajo(s) en curso.` : null,
      pendingJobs
    }
  }

  private checkLastBackup(): HealthCheck & { backedUpAt: string | null } {
    const backedUpAt = latestBackupAt()
    return {
      status: backedUpAt ? 'healthy' : 'warning',
      label: 'Último respaldo',
      detail: backedUpAt ? null : 'Aún no se ha creado ningún respaldo.',
      backedUpAt
    }
  }
}
