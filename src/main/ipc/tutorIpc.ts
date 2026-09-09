import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { ConversationRepository } from '../database/repositories/conversationRepository'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import { ProcessingJobRepository } from '../database/repositories/processingJobRepository'
import { DiagnosticsRepository } from '../database/repositories/diagnosticsRepository'
import { SettingsRepository } from '../database/repositories/settingsRepository'
import { RetrievalService } from '../retrieval/retrievalService'
import { TutorService } from '../tutor/tutorService'
import { OpenAIProvider } from '../ai/openAIProvider'
import { InstrumentedAIProvider } from '../diagnostics/instrumentedAIProvider'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { AIProvider, EmbeddingProvider } from '../../shared/types/ai'
import type { ConversationDetail } from '../../shared/types/tutor'

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

function assertQuestion(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 4000) {
    throw new AppError({
      code: 'INVALID_ARGUMENT',
      userMessage: 'La pregunta no puede estar vacía.'
    })
  }
  return value.trim()
}

export function registerTutorIpc(
  db: Database,
  embeddings: EmbeddingProvider,
  ai: AIProvider = new OpenAIProvider()
): void {
  const conversations = new ConversationRepository(db)
  const documents = new DocumentRepository(db)
  const chunks = new DocumentChunkRepository(db)
  const jobs = new ProcessingJobRepository(db)
  const diagnostics = new DiagnosticsRepository(db)
  const settings = new SettingsRepository(db)
  const retrieval = new RetrievalService(chunks, embeddings)
  const instrumentedAi = new InstrumentedAIProvider(ai, diagnostics, 'tutor')
  const tutor = new TutorService(
    conversations,
    retrieval,
    instrumentedAi,
    diagnostics,
    documents,
    chunks,
    jobs,
    settings
  )

  handle('tutor:getLatestConversation', (): ConversationDetail | null => {
    const conversation = conversations.getLatest()
    if (!conversation) return null
    return { ...conversation, messages: conversations.getMessages(conversation.id) }
  })

  handle('tutor:newConversation', (): ConversationDetail => {
    const conversation = conversations.create()
    return { ...conversation, messages: [] }
  })

  handle('tutor:ask', (_event, question, conversationId) => {
    const validQuestion = assertQuestion(question)
    const convId =
      typeof conversationId === 'string' && conversationId
        ? conversationId
        : conversations.create().id

    void (async () => {
      try {
        for await (const evt of tutor.ask(convId, validQuestion)) {
          for (const window of BrowserWindow.getAllWindows()) {
            window.webContents.send('tutor:event', evt)
          }
        }
      } catch (error) {
        logger.error('Tutor ask failed unexpectedly', {
          message: error instanceof Error ? error.message : String(error)
        })
        const appError =
          error instanceof AppError
            ? error
            : new AppError({
                code: 'AI_REQUEST_FAILED',
                userMessage: 'El Tutor no pudo responder.'
              })
        for (const window of BrowserWindow.getAllWindows()) {
          window.webContents.send('tutor:event', {
            type: 'error',
            conversationId: convId,
            messageId: convId,
            errorMessage: appError.userMessage
          })
        }
      }
    })()

    return { conversationId: convId }
  })
}
