import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { CourseRepository } from '../database/repositories/courseRepository'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { FlashcardRepository } from '../database/repositories/flashcardRepository'
import { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import { RetrievalService } from '../retrieval/retrievalService'
import { FlashcardService } from '../flashcards/flashcardService'
import { OpenAIProvider } from '../ai/openAIProvider'
import { LocalEmbeddingProvider } from '../ai/localEmbeddingProvider'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { AIProvider, EmbeddingProvider } from '../../shared/types/ai'
import type {
  CreateFlashcardInput,
  DeckSummary,
  Flashcard,
  FlashcardRating,
  ReviewOutcome
} from '../../shared/types/flashcards'

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

const VALID_RATINGS: FlashcardRating[] = ['again', 'hard', 'good', 'easy']

function assertRating(value: unknown): FlashcardRating {
  if (typeof value !== 'string' || !VALID_RATINGS.includes(value as FlashcardRating)) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Calificación inválida.' })
  }
  return value as FlashcardRating
}

function assertCreateInput(value: unknown): CreateFlashcardInput {
  if (typeof value !== 'object' || value === null) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Tarjeta inválida.' })
  }
  const input = value as Record<string, unknown>
  return {
    courseId: assertId(input.courseId, 'Curso inválido.'),
    front: typeof input.front === 'string' ? input.front : '',
    back: typeof input.back === 'string' ? input.back : '',
    hint: typeof input.hint === 'string' ? input.hint : null
  }
}

export function registerFlashcardsIpc(
  db: Database,
  embeddings: EmbeddingProvider = new LocalEmbeddingProvider(),
  ai: AIProvider = new OpenAIProvider()
): void {
  const service = new FlashcardService(
    new CourseRepository(db),
    new DocumentRepository(db),
    new FlashcardRepository(db),
    new RetrievalService(new DocumentChunkRepository(db), embeddings),
    ai
  )

  handle('flashcards:generate', async (_event, courseId): Promise<Flashcard[]> => {
    return service.generate(assertId(courseId, 'Curso inválido.'))
  })

  handle('flashcards:createManual', (_event, input): Flashcard => {
    return service.createManual(assertCreateInput(input))
  })

  handle('flashcards:listDecks', (): DeckSummary[] => service.listDecks())

  handle('flashcards:getDeck', (_event, courseId): Flashcard[] => {
    return service.getDeck(assertId(courseId, 'Curso inválido.'))
  })

  handle('flashcards:getReviewQueue', (_event, courseId): Flashcard[] => {
    return service.getReviewQueue(assertId(courseId, 'Curso inválido.'))
  })

  handle('flashcards:submitReview', (_event, flashcardId, rating): ReviewOutcome => {
    return service.submitReview(assertId(flashcardId, 'Tarjeta inválida.'), assertRating(rating))
  })
}
