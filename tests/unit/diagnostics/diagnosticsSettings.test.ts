import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { SettingsRepository } from '../../../src/main/database/repositories/settingsRepository'
import {
  getDiagnosticsSettings,
  setDiagnosticsSettings
} from '../../../src/main/diagnostics/diagnosticsSettings'

let settings: SettingsRepository

beforeEach(() => {
  const db = new Database(':memory:')
  runMigrations(db)
  settings = new SettingsRepository(db)
})

describe('diagnosticsSettings', () => {
  it('defaults to storeDetails: true before anything is saved', () => {
    expect(getDiagnosticsSettings(settings)).toEqual({ storeDetails: true })
  })

  it('persists and round-trips a change', () => {
    setDiagnosticsSettings(settings, { storeDetails: false })
    expect(getDiagnosticsSettings(settings)).toEqual({ storeDetails: false })
  })
})
