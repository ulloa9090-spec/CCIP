import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { UserRepository } from '../../../src/main/database/repositories/userRepository'

let db: Database.Database
let repository: UserRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  repository = new UserRepository(db)
})

describe('UserRepository', () => {
  it('returns null when no profile exists yet', () => {
    expect(repository.getProfile()).toBeNull()
  })

  it('creates a single profile lazily and returns it on subsequent calls', () => {
    const created = repository.ensureProfile('Luis')
    const again = repository.ensureProfile('Otro nombre')

    expect(again).toEqual(created)
    expect(db.prepare('SELECT COUNT(*) as count FROM users').get()).toEqual({ count: 1 })
  })

  it('updates the display name and bumps updated_at', async () => {
    const created = repository.ensureProfile('Luis')
    await new Promise((resolve) => setTimeout(resolve, 2))

    const updated = repository.updateDisplayName('Nuevo Nombre')

    expect(updated.id).toBe(created.id)
    expect(updated.displayName).toBe('Nuevo Nombre')
    expect(updated.updatedAt).not.toBe(created.updatedAt)
  })
})
