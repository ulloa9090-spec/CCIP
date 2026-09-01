import type { Database } from 'better-sqlite3'
import { cpSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { paths } from '../filesystem/paths'

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * Manual backup for Fase 12 (ROADMAP_IMPLEMENTATION.md §14) — a full,
 * restorable copy of the local database and imported PDFs, written to the
 * already-scaffolded `paths.backups()` directory (created in Fase 0/1,
 * unused until now). Uses better-sqlite3's built-in online backup API
 * (`db.backup()`) so it never has to pause writers or risk copying a
 * half-written file, unlike a plain filesystem copy of the .sqlite file.
 */
export async function createBackup(db: Database): Promise<{ path: string }> {
  const backupDir = join(paths.backups(), `backup-${timestampSlug()}`)
  mkdirSync(backupDir, { recursive: true })

  await db.backup(join(backupDir, 'studyos.sqlite'))

  const documentsSource = paths.documents()
  if (existsSync(documentsSource)) {
    cpSync(documentsSource, join(backupDir, 'documents'), { recursive: true })
  }

  return { path: backupDir }
}
