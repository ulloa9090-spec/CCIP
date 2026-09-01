import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { UserRepository } from '../../../src/main/database/repositories/userRepository'
import { SettingsRepository } from '../../../src/main/database/repositories/settingsRepository'

/**
 * Exercises the actual "close the app, reopen it, data is still there" path
 * (ROADMAP_IMPLEMENTATION.md Fase 1 "Done" criterion) against a real file on
 * disk — not `:memory:` — by opening two independent Database connections
 * against the same file, simulating two separate app launches.
 */
let dir: string
let dbFile: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'studyos-persistence-'))
  dbFile = join(dir, 'studyos.sqlite')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('persistence across restarts', () => {
  it('keeps the user profile and settings after the database is closed and reopened', () => {
    const firstRun = new Database(dbFile)
    runMigrations(firstRun)
    new UserRepository(firstRun).updateDisplayName('Luis Ulloa')
    new SettingsRepository(firstRun).set('onboarding.completed', true)
    firstRun.close()

    const secondRun = new Database(dbFile)
    runMigrations(secondRun) // no-op: user_version already at latest

    const profile = new UserRepository(secondRun).getProfile()
    const onboardingCompleted = new SettingsRepository(secondRun).get<boolean>(
      'onboarding.completed'
    )
    secondRun.close()

    expect(profile?.displayName).toBe('Luis Ulloa')
    expect(onboardingCompleted).toBe(true)
  })
})
