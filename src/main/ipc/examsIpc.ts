import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { CourseRepository } from '../database/repositories/courseRepository'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { QuestionRepository } from '../database/repositories/questionRepository'
import { AssessmentRepository } from '../database/repositories/assessmentRepository'
import { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import { RetrievalService } from '../retrieval/retrievalService'
import { QuizService } from '../assessment/quizService'
import { OpenAIProvider } from '../ai/openAIProvider'
import { LocalEmbeddingProvider } from '../ai/localEmbeddingProvider'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { AIProvider, EmbeddingProvider } from '../../shared/types/ai'
import type {
  AssessmentHistoryEntry,
  AssessmentResult,
  AttemptDetail
} from '../../shared/types/assessment'

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

function assertId(value: unknown, userMessage: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage })
  }
  return value
}

function assertChoiceIndex(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Respuesta inválida.' })
  }
  return value
}

export function registerExamsIpc(
  db: Database,
  embeddings: EmbeddingProvider = new LocalEmbeddingProvider(),
  ai: AIProvider = new OpenAIProvider()
): void {
  const service = new QuizService(
    new CourseRepository(db),
    new DocumentRepository(db),
    new QuestionRepository(db),
    new AssessmentRepository(db),
    new RetrievalService(new DocumentChunkRepository(db), embeddings),
    ai
  )

  handle('exams:generate', async (_event, courseId): Promise<{ attemptId: string }> => {
    return service.generate(assertId(courseId, 'Curso inválido.'))
  })

  handle('exams:getAttempt', (_event, attemptId): AttemptDetail => {
    return service.getAttemptDetail(assertId(attemptId, 'Examen inválido.'))
  })

  handle('exams:submitAnswer', (_event, attemptId, questionId, choiceIndex): AttemptDetail => {
    return service.submitAnswer(
      assertId(attemptId, 'Examen inválido.'),
      assertId(questionId, 'Pregunta inválida.'),
      assertChoiceIndex(choiceIndex)
    )
  })

  handle('exams:finish', (_event, attemptId): AssessmentResult => {
    return service.finish(assertId(attemptId, 'Examen inválido.'))
  })

  handle('exams:getResult', (_event, attemptId): AssessmentResult => {
    return service.getResult(assertId(attemptId, 'Examen inválido.'))
  })

  handle('exams:listHistory', (): AssessmentHistoryEntry[] => service.listHistory())
}
