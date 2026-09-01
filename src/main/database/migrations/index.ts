import type { Database } from 'better-sqlite3'
import { migration0001Initial } from './0001_initial'
import { migration0002Documents } from './0002_documents'
import { migration0003DocumentChunks } from './0003_document_chunks'
import { migration0004AiConversations } from './0004_ai_conversations'
import { migration0005Courses } from './0005_courses'
import { migration0006Study } from './0006_study'
import { migration0007Assessment } from './0007_assessment'
import type { Migration } from './types'

export type { Migration } from './types'

/** Ordered by version; the runner applies whatever is newer than `PRAGMA user_version`. */
export const MIGRATIONS: Migration[] = [
  migration0001Initial,
  migration0002Documents,
  migration0003DocumentChunks,
  migration0004AiConversations,
  migration0005Courses,
  migration0006Study,
  migration0007Assessment
]

/**
 * Versioned migrations using SQLite's built-in `user_version` pragma —
 * no extra tracking table needed. Each pending migration runs inside its
 * own transaction so a failure never leaves the schema half-applied.
 */
export function runMigrations(db: Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  const pending = MIGRATIONS.filter((migration) => migration.version > currentVersion).sort(
    (a, b) => a.version - b.version
  )

  for (const migration of pending) {
    const apply = db.transaction(() => {
      db.exec(migration.up)
      db.pragma(`user_version = ${migration.version}`)
    })
    apply()
  }
}
