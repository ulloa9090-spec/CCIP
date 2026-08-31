import { ipcMain } from 'electron'
import type { Database } from 'better-sqlite3'
import { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import { RetrievalService } from '../retrieval/retrievalService'
import { LocalEmbeddingProvider } from '../ai/localEmbeddingProvider'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { EmbeddingProvider } from '../../shared/types/ai'
import type { RetrievalResult } from '../../shared/types/retrieval'

function handle(channel: string, fn: (...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]) => {
    try {
      return await fn(...args)
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

function assertQuery(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 500) {
    throw new AppError({
      code: 'INVALID_ARGUMENT',
      userMessage: 'La búsqueda no puede estar vacía.'
    })
  }
  return value
}

export function registerRetrievalIpc(
  db: Database,
  embeddings: EmbeddingProvider = new LocalEmbeddingProvider()
): void {
  const service = new RetrievalService(new DocumentChunkRepository(db), embeddings)

  handle('retrieval:search', (query, documentIds): Promise<RetrievalResult[]> =>
    service.search(assertQuery(query), documentIds as string[] | undefined)
  )
}
