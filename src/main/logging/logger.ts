import { appendFileSync } from 'fs'
import { join } from 'path'
import { paths } from '../filesystem/paths'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Never pass API keys, full document content, or full prompts as `meta` —
 * ARCHITECTURE.md §14. Callers are responsible for redacting before logging.
 */
function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = { ts: new Date().toISOString(), level, message, ...meta }

  const consoleFn =
    level === 'debug'
      ? console.debug
      : level === 'info'
        ? console.info
        : level === 'warn'
          ? console.warn
          : console.error
  consoleFn(`[StudyOS] ${message}`, meta ?? '')

  try {
    appendFileSync(join(paths.logs(), 'main.log'), JSON.stringify(entry) + '\n')
  } catch {
    // Logging must never crash the app.
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>): void => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>): void => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>): void => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>): void => write('error', message, meta)
}
