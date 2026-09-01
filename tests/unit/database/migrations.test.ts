import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS, runMigrations } from '../../../src/main/database/migrations'

function tableNames(db: Database.Database): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
      name: string
    }[]
  ).map((row) => row.name)
}

const LATEST_VERSION = Math.max(...MIGRATIONS.map((m) => m.version))

describe('runMigrations', () => {
  it('creates the full schema and sets user_version to the latest migration', () => {
    const db = new Database(':memory:')

    runMigrations(db)

    expect(tableNames(db)).toEqual(
      expect.arrayContaining([
        'users',
        'settings',
        'documents',
        'document_pages',
        'processing_jobs'
      ])
    )
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST_VERSION)
  })

  it('is idempotent — running twice does not re-apply or error', () => {
    const db = new Database(':memory:')

    runMigrations(db)
    expect(() => runMigrations(db)).not.toThrow()
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST_VERSION)
  })
})
