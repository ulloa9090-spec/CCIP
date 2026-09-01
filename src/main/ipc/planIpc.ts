import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { CourseRepository } from '../database/repositories/courseRepository'
import { PlanRepository } from '../database/repositories/planRepository'
import { PlanService } from '../plan/planService'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { RecalculatePlanInput, StudyPlan } from '../../shared/types/plan'

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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function assertRecalculateInput(value: unknown): RecalculatePlanInput {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object') {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Datos de recálculo inválidos.' })
  }
  const input = value as Partial<RecalculatePlanInput>
  const result: RecalculatePlanInput = {}
  if (input.targetDate !== undefined) {
    if (typeof input.targetDate !== 'string' || !DATE_PATTERN.test(input.targetDate)) {
      throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Fecha objetivo inválida.' })
    }
    result.targetDate = input.targetDate
  }
  if (input.dailyMinutes !== undefined) {
    if (typeof input.dailyMinutes !== 'number' || input.dailyMinutes <= 0) {
      throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Minutos diarios inválidos.' })
    }
    result.dailyMinutes = input.dailyMinutes
  }
  return result
}

export function registerPlanIpc(db: Database): void {
  const service = new PlanService(new CourseRepository(db), new PlanRepository(db))

  handle('plan:get', (_event, courseId): StudyPlan => {
    return service.getPlan(assertId(courseId, 'Curso inválido.'))
  })

  handle('plan:recalculate', (_event, courseId, input): StudyPlan => {
    return service.recalculate(assertId(courseId, 'Curso inválido.'), assertRecalculateInput(input))
  })
}
