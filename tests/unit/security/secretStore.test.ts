import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let dir: string

// `electron`'s safeStorage only exists inside a real Electron process; fake
// it here with a reversible (base64) transform so the store logic — file
// read/write, status derivation, clearing — is verified without Electron.
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (value: string) => Buffer.from(value, 'utf8'),
    decryptString: (buffer: Buffer) => buffer.toString('utf8')
  }
}))

vi.mock('../../../src/main/filesystem/paths', () => ({
  paths: {
    secrets: () => dir
  }
}))

describe('secretStore', () => {
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'studyos-secrets-'))
    vi.resetModules()
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('reports not configured before any key is set', async () => {
    const { getOpenAIKeyStatus } = await import('../../../src/main/security/secretStore')
    expect(getOpenAIKeyStatus()).toEqual({ configured: false, lastFour: null })
  })

  it('stores the key encrypted at rest and only exposes the last 4 characters', async () => {
    const secretStore = await import('../../../src/main/security/secretStore')
    secretStore.setOpenAIKey('sk-test-1234567890')

    expect(secretStore.getOpenAIKeyStatus()).toEqual({ configured: true, lastFour: '7890' })
    expect(secretStore.getOpenAIKeyForUse()).toBe('sk-test-1234567890')
  })

  it('removes the key on clear', async () => {
    const secretStore = await import('../../../src/main/security/secretStore')
    secretStore.setOpenAIKey('sk-test-1234567890')

    secretStore.clearOpenAIKey()

    expect(secretStore.getOpenAIKeyStatus()).toEqual({ configured: false, lastFour: null })
    expect(secretStore.getOpenAIKeyForUse()).toBeNull()
  })
})
