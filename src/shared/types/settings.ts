/** IPC contract types shared between main (implementation) and renderer (consumer). */

export interface UserProfile {
  id: string
  displayName: string
  createdAt: string
  updatedAt: string
}

export interface AIKeyStatus {
  configured: boolean
  /** Last 4 characters only — the full key never crosses the IPC boundary once saved. */
  lastFour: string | null
}

/** Fase 12 (Polish) — dark is the base identity (ADR-003); light is the only alternative, no "system" auto mode. */
export type Theme = 'dark' | 'light'

export interface BackupResult {
  /** Absolute path to the created backup folder (database copy + documents copy). */
  path: string
}

export interface ExportNotesResult {
  /** Absolute path to the written file, or null if the user canceled the save dialog. */
  path: string | null
}
