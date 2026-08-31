import type { Migration } from './types'

/**
 * Phase 1 needs only `users` (single local profile, DATA_MODEL.md §1) and
 * `settings` (generic key/value preferences, DATA_MODEL.md §2 — explicitly
 * NOT for API keys, those live in safeStorage). Every other table from
 * DATA_MODEL.md arrives in the migration for the phase that first uses it
 * (documents in Fase 2, courses in Fase 5, etc.) — see DECISIONS.md ADR-007.
 */
export const migration0001Initial: Migration = {
  version: 1,
  name: 'initial',
  up: `
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_settings_key ON settings(key);
  `
}
