import { describe, expect, it } from 'vitest'
import { AppError, parseSerializedAppError } from '../../../src/shared/types/errors'

describe('AppError / parseSerializedAppError', () => {
  it('round-trips through JSON the way the IPC boundary serializes it', () => {
    const error = new AppError({
      code: 'INVALID_ARGUMENT',
      userMessage: 'El nombre debe tener entre 1 y 80 caracteres.',
      recoverable: true
    })

    // ipcMain.handle -> ipcRenderer.invoke only preserves `.message` across
    // the boundary, so the real path is: throw new Error(JSON.stringify(...)).
    const crossedBoundary = new Error(JSON.stringify(error.toJSON()))

    expect(parseSerializedAppError(crossedBoundary)).toEqual({
      code: 'INVALID_ARGUMENT',
      message: 'El nombre debe tener entre 1 y 80 caracteres.',
      userMessage: 'El nombre debe tener entre 1 y 80 caracteres.',
      recoverable: true,
      metadata: undefined
    })
  })

  it('falls back to a generic, safe message for a non-structured error', () => {
    const parsed = parseSerializedAppError(new Error('ECONNREFUSED'))

    expect(parsed.code).toBe('UNKNOWN')
    expect(parsed.userMessage).toBe('Ocurrió un error inesperado.')
  })

  it('extracts the payload from the real Electron ipcRenderer.invoke wrapper', () => {
    // Reproduces the actual runtime format (found via manual E2E verification,
    // not just unit-level assumption) — Electron prefixes the handler's
    // thrown message before it reaches the renderer.
    const error = new AppError({
      code: 'SECURE_STORAGE_UNAVAILABLE',
      userMessage: 'El almacenamiento seguro del sistema no está disponible en este equipo.',
      recoverable: false
    })
    const wrapped = new Error(
      `Error invoking remote method 'settings:setAIKey': Error: ${JSON.stringify(error.toJSON())}`
    )

    const parsed = parseSerializedAppError(wrapped)

    expect(parsed.code).toBe('SECURE_STORAGE_UNAVAILABLE')
    expect(parsed.userMessage).toBe(
      'El almacenamiento seguro del sistema no está disponible en este equipo.'
    )
  })
})
