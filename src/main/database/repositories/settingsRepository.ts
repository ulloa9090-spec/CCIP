import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'

interface SettingRow {
  id: string
  key: string
  value_json: string
  updated_at: string
}

/**
 * Generic key/value preferences store (DATA_MODEL.md §2). Never used for
 * secrets — API keys live in safeStorage (src/main/security/secretStore.ts).
 * No feature reads/writes it yet in Phase 1 (see DECISIONS.md); it ships
 * now, tested, because its shape is already fully specified and stable.
 */
export class SettingsRepository {
  constructor(private readonly db: Database) {}

  get<T>(key: string): T | undefined {
    const row = this.db.prepare('SELECT * FROM settings WHERE key = ?').get(key) as
      SettingRow | undefined
    return row ? (JSON.parse(row.value_json) as T) : undefined
  }

  set<T>(key: string, value: T): void {
    const now = new Date().toISOString()
    const existing = this.db.prepare('SELECT id FROM settings WHERE key = ?').get(key) as
      { id: string } | undefined

    if (existing) {
      this.db
        .prepare('UPDATE settings SET value_json = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(value), now, existing.id)
    } else {
      this.db
        .prepare('INSERT INTO settings (id, key, value_json, updated_at) VALUES (?, ?, ?, ?)')
        .run(ulid(), key, JSON.stringify(value), now)
    }
  }
}
