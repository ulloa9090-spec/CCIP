import { ipcMain } from 'electron'
import type { Database } from 'better-sqlite3'
import { UserRepository } from '../database/repositories/userRepository'
import { clearOpenAIKey, getOpenAIKeyStatus, setOpenAIKey } from '../security/secretStore'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'

/**
 * Wraps every handler so a thrown AppError crosses the IPC boundary as a
 * JSON-serialized payload the renderer can parse back (see
 * shared/types/errors.ts) instead of losing its `code`/`userMessage`, and so
 * an unexpected error never leaks internals to the renderer.
 */
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

function assertDisplayName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 80) {
    throw new AppError({
      code: 'INVALID_ARGUMENT',
      userMessage: 'El nombre debe tener entre 1 y 80 caracteres.'
    })
  }
  return value.trim()
}

function assertApiKey(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length < 10 || value.length > 300) {
    throw new AppError({
      code: 'INVALID_ARGUMENT',
      userMessage: 'La clave no parece válida.'
    })
  }
  return value.trim()
}

export function registerSettingsIpc(db: Database): void {
  const userRepository = new UserRepository(db)

  handle('settings:getProfile', () => userRepository.ensureProfile())

  handle('settings:updateDisplayName', (name) =>
    userRepository.updateDisplayName(assertDisplayName(name))
  )

  handle('settings:getAIKeyStatus', () => getOpenAIKeyStatus())

  handle('settings:setAIKey', (key) => {
    setOpenAIKey(assertApiKey(key))
    return getOpenAIKeyStatus()
  })

  handle('settings:clearAIKey', () => {
    clearOpenAIKey()
    return getOpenAIKeyStatus()
  })
}
