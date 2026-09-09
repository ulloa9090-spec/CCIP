import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { DiagnosticsRepository } from '../database/repositories/diagnosticsRepository'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import { ProcessingJobRepository } from '../database/repositories/processingJobRepository'
import { SettingsRepository } from '../database/repositories/settingsRepository'
import { RetrievalService } from '../retrieval/retrievalService'
import { SystemHealthService } from '../diagnostics/systemHealthService'
import { listDocumentHealth } from '../diagnostics/documentHealth'
import { getDiagnosticsSettings, setDiagnosticsSettings } from '../diagnostics/diagnosticsSettings'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { EmbeddingProvider } from '../../shared/types/ai'
import type {
  DiagnosticFeature,
  DiagnosticRequestDetail,
  DiagnosticRequestSummary,
  DiagnosticsSettings,
  DocumentHealth,
  RetrievalInspectionRequest,
  RetrievalInspectionResult,
  SystemHealth,
  UsageRange,
  AIUsageSummary
} from '../../shared/types/diagnostics'

function handle(
  channel: string,
  fn: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    try {
      return await fn(event, ...args)
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : new AppError({
              code: 'INTERNAL',
              userMessage: 'Ocurrió un error inesperado.',
              cause: error
            })
      logger.error(`IPC ${channel} failed`, { code: appError.code })
      throw new Error(JSON.stringify(appError.toJSON()))
    }
  })
}

const FEATURES: DiagnosticFeature[] = [
  'tutor',
  'course_generation',
  'assessment_generation',
  'flashcard_generation',
  'study_plan',
  'other'
]
const RANGES: UsageRange[] = ['today', '7d', '30d', 'all']

function assertRange(value: unknown): UsageRange {
  if (typeof value !== 'string' || !RANGES.includes(value as UsageRange)) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Rango inválido.' })
  }
  return value as UsageRange
}

function assertFeature(value: unknown): DiagnosticFeature | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || !FEATURES.includes(value as DiagnosticFeature)) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Feature inválida.' })
  }
  return value as DiagnosticFeature
}

function assertRequestId(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'ID de solicitud inválido.' })
  }
  return value
}

function assertInspectionRequest(value: unknown): RetrievalInspectionRequest {
  if (typeof value !== 'object' || value === null) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Solicitud inválida.' })
  }
  const { query, documentIds, topK } = value as Record<string, unknown>
  if (typeof query !== 'string' || query.trim().length === 0 || query.length > 500) {
    throw new AppError({
      code: 'INVALID_ARGUMENT',
      userMessage: 'La búsqueda no puede estar vacía.'
    })
  }
  return {
    query,
    documentIds: Array.isArray(documentIds) ? (documentIds as string[]) : undefined,
    topK: typeof topK === 'number' && topK > 0 && topK <= 50 ? topK : undefined
  }
}

function assertDiagnosticsSettings(value: unknown): DiagnosticsSettings {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as { storeDetails?: unknown }).storeDetails !== 'boolean'
  ) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Configuración inválida.' })
  }
  return { storeDetails: (value as { storeDetails: boolean }).storeDetails }
}

/**
 * Fase 13's read side: every "Developer Diagnostics" screen (System Health,
 * AI Usage, Retrieval Inspector, Request History, Document Processing
 * Health) is a thin IPC handler over the repositories/services Tasks #1-#3
 * already built — this file adds no new business logic of its own.
 */
export function registerDiagnosticsIpc(db: Database, embeddings: EmbeddingProvider): void {
  const diagnostics = new DiagnosticsRepository(db)
  const documents = new DocumentRepository(db)
  const chunks = new DocumentChunkRepository(db)
  const jobs = new ProcessingJobRepository(db)
  const settings = new SettingsRepository(db)
  const retrieval = new RetrievalService(chunks, embeddings)
  const health = new SystemHealthService(db, diagnostics, chunks, jobs, embeddings)

  handle('diagnostics:getSystemHealth', (): SystemHealth => health.getSystemHealth())

  handle('diagnostics:getUsageSummary', (_event, range): AIUsageSummary =>
    diagnostics.getUsageSummary(assertRange(range))
  )

  handle('diagnostics:listRequests', (_event, feature, limit): DiagnosticRequestSummary[] =>
    diagnostics.listRequests(
      typeof limit === 'number' && limit > 0 && limit <= 200 ? limit : 50,
      assertFeature(feature)
    )
  )

  handle('diagnostics:getRequestDetail', (_event, id): DiagnosticRequestDetail | null =>
    diagnostics.getRequestDetail(assertRequestId(id))
  )

  handle(
    'diagnostics:inspectRetrieval',
    async (_event, request): Promise<RetrievalInspectionResult> => {
      const validated = assertInspectionRequest(request)
      const start = Date.now()
      const results = await retrieval.search(
        validated.query,
        validated.documentIds,
        validated.topK ?? 8
      )
      return {
        query: validated.query,
        topK: validated.topK ?? 8,
        results,
        durationMs: Date.now() - start,
        bestScore: results.length > 0 ? results[0].score : null
      }
    }
  )

  handle('diagnostics:listDocumentHealth', (): DocumentHealth[] =>
    listDocumentHealth(documents, chunks, jobs)
  )

  handle('diagnostics:getSettings', (): DiagnosticsSettings => getDiagnosticsSettings(settings))

  handle('diagnostics:setSettings', (_event, value): DiagnosticsSettings =>
    setDiagnosticsSettings(settings, assertDiagnosticsSettings(value))
  )
}
