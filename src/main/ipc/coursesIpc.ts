import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { CourseRepository } from '../database/repositories/courseRepository'
import { CourseService } from '../courses/courseService'
import { OpenAIProvider } from '../ai/openAIProvider'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { AIProvider } from '../../shared/types/ai'
import type { Course, CourseDetail, CreateCourseInput } from '../../shared/types/courses'

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

function assertCreateCourseInput(value: unknown): CreateCourseInput {
  if (typeof value !== 'object' || value === null) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Datos del curso inválidos.' })
  }
  const input = value as Partial<CreateCourseInput>
  if (
    typeof input.objective !== 'string' ||
    input.objective.trim().length === 0 ||
    !Array.isArray(input.documentIds) ||
    input.documentIds.length === 0 ||
    typeof input.durationDays !== 'number' ||
    input.durationDays <= 0 ||
    typeof input.dailyMinutes !== 'number' ||
    input.dailyMinutes <= 0 ||
    typeof input.style !== 'string'
  ) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Datos del curso inválidos.' })
  }
  return {
    objective: input.objective.trim(),
    documentIds: input.documentIds,
    durationDays: input.durationDays,
    dailyMinutes: input.dailyMinutes,
    style: input.style as CreateCourseInput['style']
  }
}

function assertCourseId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Curso inválido.' })
  }
  return value
}

export function registerCoursesIpc(db: Database, ai: AIProvider = new OpenAIProvider()): void {
  const documents = new DocumentRepository(db)
  const courses = new CourseRepository(db)
  const service = new CourseService(documents, courses, ai)

  handle('courses:create', async (_event, input): Promise<CourseDetail> => {
    return service.create(assertCreateCourseInput(input))
  })

  handle('courses:list', (): Course[] => courses.list())

  handle('courses:get', (_event, id): CourseDetail => {
    const courseId = assertCourseId(id)
    const course = courses.getById(courseId)
    if (!course) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Curso no encontrado.' })
    }
    return course
  })
}
