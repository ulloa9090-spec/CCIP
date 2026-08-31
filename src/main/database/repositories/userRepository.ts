import type { Database } from 'better-sqlite3'
import { ulid } from 'ulid'
import type { UserProfile } from '../../../shared/types/settings'

interface UserRow {
  id: string
  display_name: string
  created_at: string
  updated_at: string
}

function mapRow(row: UserRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * StudyOS is single-profile in the MVP (DATA_MODEL.md §1) — there is at
 * most one row in `users`, created lazily on first access.
 */
export class UserRepository {
  constructor(private readonly db: Database) {}

  getProfile(): UserProfile | null {
    const row = this.db.prepare('SELECT * FROM users LIMIT 1').get() as UserRow | undefined
    return row ? mapRow(row) : null
  }

  ensureProfile(defaultDisplayName = 'Estudiante'): UserProfile {
    const existing = this.getProfile()
    if (existing) return existing

    const now = new Date().toISOString()
    const id = ulid()
    this.db
      .prepare('INSERT INTO users (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, defaultDisplayName, now, now)

    return { id, displayName: defaultDisplayName, createdAt: now, updatedAt: now }
  }

  updateDisplayName(displayName: string): UserProfile {
    const profile = this.ensureProfile()
    const now = new Date().toISOString()
    this.db
      .prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?')
      .run(displayName, now, profile.id)

    return { ...profile, displayName, updatedAt: now }
  }
}
