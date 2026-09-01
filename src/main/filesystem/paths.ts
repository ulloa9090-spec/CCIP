import { app } from 'electron'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

/**
 * Storage layout per ARCHITECTURE.md §9. `app.getPath('userData')` already
 * resolves to a directory scoped to this app (via appId/productName), so it
 * doubles as the "StudyOS/" root — no extra nesting needed.
 */
export const paths = {
  root: (): string => app.getPath('userData'),
  database: (): string => join(app.getPath('userData'), 'database', 'studyos.sqlite'),
  documents: (): string => join(app.getPath('userData'), 'documents'),
  indexes: (): string => join(app.getPath('userData'), 'indexes'),
  exports: (): string => join(app.getPath('userData'), 'exports'),
  backups: (): string => join(app.getPath('userData'), 'backups'),
  logs: (): string => join(app.getPath('userData'), 'logs'),
  secrets: (): string => join(app.getPath('userData'), 'secrets')
}

export function ensureAppDirectories(): void {
  const directories = [
    dirname(paths.database()),
    paths.documents(),
    paths.indexes(),
    paths.exports(),
    paths.backups(),
    paths.logs(),
    paths.secrets()
  ]
  for (const dir of directories) {
    mkdirSync(dir, { recursive: true })
  }
}
