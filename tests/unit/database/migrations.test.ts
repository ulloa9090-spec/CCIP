import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'

function tableNames(db: Database.Database): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
      name: string
    }[]
  ).map((row) => row.name)
}

describe('runMigrations', () => {
  it('creates the Phase 1 schema and sets user_version', () => {
    const db = new Database(':memory:')

    runMigrations(db)

    expect(tableNames(db)).toEqual(expect.arrayContaining(['users', 'settings']))
    expect(db.pragma('user_version', { simple: true })).toBe(1)
  })

  it('is idempotent — running twice does not re-apply or error', () => {
    const db = new Database(':memory:')

    runMigrations(db)
    expect(() => runMigrations(db)).not.toThrow()
    expect(db.pragma('user_version', { simple: true })).toBe(1)
  })
})
