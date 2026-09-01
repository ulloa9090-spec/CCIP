import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { ConceptRepository } from '../database/repositories/conceptRepository'
import { MasteryRepository } from '../database/repositories/masteryRepository'
import { MasteryService } from '../mastery/masteryService'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { CourseMastery } from '../../shared/types/mastery'

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

export function registerMasteryIpc(db: Database): void {
  const service = new MasteryService(new ConceptRepository(db), new MasteryRepository(db))

  handle('mastery:getCourseMastery', (_event, courseId): CourseMastery => {
    return service.getCourseMastery(assertId(courseId, 'Curso inválido.'))
  })
}
