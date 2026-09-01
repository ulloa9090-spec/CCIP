import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { CourseRepository } from '../database/repositories/courseRepository'
import { StudySessionRepository } from '../database/repositories/studySessionRepository'
import { AssessmentRepository } from '../database/repositories/assessmentRepository'
import { FlashcardRepository } from '../database/repositories/flashcardRepository'
import { ConceptRepository } from '../database/repositories/conceptRepository'
import { MasteryRepository } from '../database/repositories/masteryRepository'
import { MasteryService } from '../mastery/masteryService'
import { ProgressService } from '../progress/progressService'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { ProgressSummary } from '../../shared/types/progress'

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

export function registerProgressIpc(db: Database): void {
  const service = new ProgressService(
    new CourseRepository(db),
    new StudySessionRepository(db),
    new AssessmentRepository(db),
    new FlashcardRepository(db),
    new MasteryService(new ConceptRepository(db), new MasteryRepository(db))
  )

  handle('progress:getSummary', (): ProgressSummary => service.getSummary())
}
