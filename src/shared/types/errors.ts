/**
 * StudyOS error model (ARCHITECTURE.md §15). Used on both sides of the IPC
 * boundary: main throws it, the boundary serializes it to a JSON string
 * inside a plain Error (Electron only preserves `.message` across
 * `ipcMain.handle`/`ipcRenderer.invoke`), and the renderer parses it back.
 */
export class AppError extends Error {
  readonly code: string
  readonly userMessage: string
  readonly recoverable: boolean
  readonly metadata?: Record<string, unknown>

  constructor(params: {
    code: string
    userMessage: string
    message?: string
    recoverable?: boolean
    metadata?: Record<string, unknown>
    cause?: unknown
  }) {
    super(params.message ?? params.userMessage, { cause: params.cause })
    this.name = 'AppError'
    this.code = params.code
    this.userMessage = params.userMessage
    this.recoverable = params.recoverable ?? true
    this.metadata = params.metadata
  }

  toJSON(): SerializedAppError {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
      metadata: this.metadata
    }
  }
}

export interface SerializedAppError {
  code: string
  message: string
  userMessage: string
  recoverable: boolean
  metadata?: Record<string, unknown>
}

function isSerializedAppError(value: unknown): value is SerializedAppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SerializedAppError).code === 'string' &&
    typeof (value as SerializedAppError).userMessage === 'string'
  )
}

/**
 * Recovers a SerializedAppError from whatever `ipcRenderer.invoke` rejected
 * with. Falls back to a generic, safe message if the error wasn't one of
 * ours (a genuinely unexpected failure should never crash the renderer).
 *
 * Electron wraps a handler's thrown message before it reaches the renderer
 * (`Error invoking remote method '<channel>': Error: <our JSON>`), so the
 * JSON payload has to be extracted from within that wrapper rather than
 * parsed as the whole string.
 */
export function parseSerializedAppError(error: unknown): SerializedAppError {
  const rawMessage = error instanceof Error ? error.message : String(error)
  const jsonStart = rawMessage.indexOf('{')
  if (jsonStart !== -1) {
    try {
      const parsed: unknown = JSON.parse(rawMessage.slice(jsonStart))
      if (isSerializedAppError(parsed)) return parsed
    } catch {
      // Not a structured AppError — fall through to the generic message.
    }
  }
  return {
    code: 'UNKNOWN',
    message: rawMessage,
    userMessage: 'Ocurrió un error inesperado.',
    recoverable: true
  }
}
