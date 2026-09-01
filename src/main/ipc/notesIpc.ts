import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { NoteRepository } from '../database/repositories/noteRepository'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { CreateNoteInput, Note } from '../../shared/types/notes'

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

function assertCreateNoteInput(value: unknown): CreateNoteInput {
  if (typeof value !== 'object' || value === null) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Nota inválida.' })
  }
  const input = value as Partial<CreateNoteInput>
  if (typeof input.body !== 'string' || input.body.trim().length === 0) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'La nota no puede estar vacía.' })
  }
  return {
    body: input.body.trim(),
    title: typeof input.title === 'string' ? input.title : null,
    documentId: typeof input.documentId === 'string' ? input.documentId : null,
    pageNumber: typeof input.pageNumber === 'number' ? input.pageNumber : null,
    courseId: typeof input.courseId === 'string' ? input.courseId : null
  }
}

export function registerNotesIpc(db: Database): void {
  const notes = new NoteRepository(db)

  handle('notes:create', (_event, input): Note => notes.create(assertCreateNoteInput(input)))

  handle('notes:listByCourse', (_event, courseId): Note[] =>
    notes.listByCourse(assertId(courseId, 'Curso inválido.'))
  )

  handle('notes:delete', (_event, id) => notes.delete(assertId(id, 'Nota inválida.')))
}
