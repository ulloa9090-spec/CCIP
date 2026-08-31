/**
 * `planned` (DATA_MODEL.md §15) is intentionally not part of this type —
 * Fase 6 always creates a session already `in_progress` at click time,
 * scheduling sessions ahead of time is the adaptive Plan's job (Fase 9).
 */
export type SessionStatus = 'in_progress' | 'completed'

/** Only `lesson` is produced by Fase 6 — the rest need engines that don't exist yet (Fase 7/10). */
export type ActivityType = 'lesson' | 'question' | 'flashcard' | 'exercise' | 'review' | 'chat'

export interface SessionActivity {
  id: string
  type: ActivityType
  position: number
  completedAt: string | null
  lessonId: string
  lessonTitle: string
  lessonSummary: string | null
  estimatedMinutes: number
}

export interface StudySessionDetail {
  id: string
  courseId: string
  courseTitle: string
  status: SessionStatus
  plannedDate: string | null
  startedAt: string | null
  completedAt: string | null
  estimatedMinutes: number
  actualMinutes: number | null
  activities: SessionActivity[]
}
