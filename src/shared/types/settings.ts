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
