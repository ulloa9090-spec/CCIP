import { ipcMain, dialog, shell, BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { UserRepository } from '../database/repositories/userRepository'
import { SettingsRepository } from '../database/repositories/settingsRepository'
import { NoteRepository } from '../database/repositories/noteRepository'
import { clearOpenAIKey, getOpenAIKeyStatus, setOpenAIKey } from '../security/secretStore'
import { createBackup } from '../backup/backupService'
import { buildNotesMarkdown } from '../notes/notesExport'
import { paths } from '../filesystem/paths'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type { BackupResult, ExportNotesResult, Theme } from '../../shared/types/settings'

const THEME_SETTING_KEY = 'theme'
const DEFAULT_THEME: Theme = 'dark'

/**
 * Wraps every handler so a thrown AppError crosses the IPC boundary as a
 * JSON-serialized payload the renderer can parse back (see
 * shared/types/errors.ts) instead of losing its `code`/`userMessage`, and so
 * an unexpected error never leaks internals to the renderer.
 */
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

function assertTheme(value: unknown): Theme {
  if (value !== 'dark' && value !== 'light') {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Tema inválido.' })
  }
  return value
}

export function registerSettingsIpc(db: Database): void {
  const userRepository = new UserRepository(db)
  const settingsRepository = new SettingsRepository(db)
  const noteRepository = new NoteRepository(db)

  handle('settings:getProfile', () => userRepository.ensureProfile())

  handle('settings:updateDisplayName', (_event, name) =>
    userRepository.updateDisplayName(assertDisplayName(name))
  )

  handle('settings:getAIKeyStatus', () => getOpenAIKeyStatus())

  handle('settings:setAIKey', (_event, key) => {
    setOpenAIKey(assertApiKey(key))
    return getOpenAIKeyStatus()
  })

  handle('settings:clearAIKey', () => {
    clearOpenAIKey()
    return getOpenAIKeyStatus()
  })

  handle('settings:getTheme', (): Theme => {
    return settingsRepository.get<Theme>(THEME_SETTING_KEY) ?? DEFAULT_THEME
  })

  handle('settings:setTheme', (_event, theme): Theme => {
    const validated = assertTheme(theme)
    settingsRepository.set(THEME_SETTING_KEY, validated)
    return validated
  })

  handle('settings:createBackup', async (): Promise<BackupResult> => {
    return createBackup(db)
  })

  handle('settings:exportNotes', async (event): Promise<ExportNotesResult> => {
    const notes = noteRepository.listAll()
    const window = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const result = await dialog.showSaveDialog(window as BrowserWindow, {
      defaultPath: join(
        paths.exports(),
        `studyos-notas-${new Date().toISOString().slice(0, 10)}.md`
      ),
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return { path: null }
    writeFileSync(result.filePath, buildNotesMarkdown(notes), 'utf-8')
    return { path: result.filePath }
  })

  handle('settings:revealBackup', (_event, path) => {
    if (typeof path !== 'string' || path.length === 0) {
      throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Ruta inválida.' })
    }
    shell.showItemInFolder(join(path, 'studyos.sqlite'))
  })
}
