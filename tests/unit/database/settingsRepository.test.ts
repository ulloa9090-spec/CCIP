import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { SettingsRepository } from '../../../src/main/database/repositories/settingsRepository'

let db: Database.Database
let repository: SettingsRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  repository = new SettingsRepository(db)
})

describe('SettingsRepository', () => {
  it('returns undefined for a key that was never set', () => {
    expect(repository.get('missing.key')).toBeUndefined()
  })

  it('round-trips JSON-serializable values', () => {
    repository.set('theme', { mode: 'dark' })
    expect(repository.get('theme')).toEqual({ mode: 'dark' })
  })

  it('overwrites an existing key instead of duplicating rows', () => {
    repository.set('locale', 'es')
    repository.set('locale', 'es-MX')

    expect(repository.get('locale')).toBe('es-MX')
    expect(db.prepare('SELECT COUNT(*) as count FROM settings').get()).toEqual({ count: 1 })
  })
})
