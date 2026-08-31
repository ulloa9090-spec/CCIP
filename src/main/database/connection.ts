import Database from 'better-sqlite3'
import { paths } from '../filesystem/paths'

let instance: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!instance) {
    instance = new Database(paths.database())
    instance.pragma('journal_mode = WAL')
    instance.pragma('foreign_keys = ON')
  }
  return instance
}

export function closeDatabase(): void {
  instance?.close()
  instance = null
}
