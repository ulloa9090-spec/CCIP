import { safeStorage } from 'electron'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { paths } from '../filesystem/paths'
import { AppError } from '../../shared/types/errors'
import type { AIKeyStatus } from '../../shared/types/settings'

function keyFilePath(): string {
  return join(paths.secrets(), 'openai.key.enc')
}

/**
 * OpenAI API key at rest, encrypted with Electron's `safeStorage` (backed by
 * macOS Keychain) — never plaintext on disk, never logged, never returned in
 * full over IPC. See DECISIONS.md ADR-001.
 */
export function setOpenAIKey(key: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new AppError({
      code: 'SECURE_STORAGE_UNAVAILABLE',
      userMessage: 'El almacenamiento seguro del sistema no está disponible en este equipo.',
      recoverable: false
    })
  }
  writeFileSync(keyFilePath(), safeStorage.encryptString(key))
}

function readDecryptedKey(): string | null {
  const file = keyFilePath()
  if (!existsSync(file)) return null
  try {
    return safeStorage.decryptString(readFileSync(file))
  } catch {
    return null
  }
}

export function getOpenAIKeyStatus(): AIKeyStatus {
  const key = readDecryptedKey()
  return key ? { configured: true, lastFour: key.slice(-4) } : { configured: false, lastFour: null }
}

/** For AIProvider use only (Phase 4) — never exposed to the renderer. */
export function getOpenAIKeyForUse(): string | null {
  return readDecryptedKey()
}

export function clearOpenAIKey(): void {
  const file = keyFilePath()
  if (existsSync(file)) unlinkSync(file)
}
