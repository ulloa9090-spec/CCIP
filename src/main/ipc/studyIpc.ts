import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { CourseRepository } from '../database/repositories/courseRepository'
import { StudySessionRepository } from '../database/repositories/studySessionRepository'
import { StudySessionService } from '../study/studySessionService'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { StudySessionDetail } from '../../shared/types/study'

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

export function registerStudyIpc(db: Database): void {
  const service = new StudySessionService(new CourseRepository(db), new StudySessionRepository(db))

  handle('study:startOrResume', (_event, courseId): StudySessionDetail => {
    return service.startOrResume(assertId(courseId, 'Curso inválido.'))
  })

  handle('study:completeActivity', (_event, activityId, understood): StudySessionDetail => {
    return service.completeActivity(
      assertId(activityId, 'Actividad inválida.'),
      Boolean(understood)
    )
  })
}
