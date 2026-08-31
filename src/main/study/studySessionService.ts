import { AppError } from '../../shared/types/errors'
import type { CourseRepository } from '../database/repositories/courseRepository'
import type { StudySessionRepository } from '../database/repositories/studySessionRepository'
import type { StudySessionDetail } from '../../shared/types/study'

/**
 * Orchestrates session generation/resume (ROADMAP_IMPLEMENTATION.md Fase 6):
 * no AI calls anywhere in this class. A study session is deterministically
 * built from the course's already-persisted lessons (Fase 5), so it works
 * fully offline and needs no network-dependent verification — unlike the
 * Course Engine or Tutor. See docs/DECISIONS.md (Fase 6 ADR).
 */
export class StudySessionService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly sessions: StudySessionRepository
  ) {}

  startOrResume(courseId: string): StudySessionDetail {
    const course = this.courses.getById(courseId)
    if (!course) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Curso no encontrado.' })
    }

    const activeSessionId = this.sessions.findActiveByCourse(courseId)
    if (activeSessionId) {
      const detail = this.sessions.getDetail(activeSessionId)
      if (detail) return detail
    }

    const pending = this.courses.listPendingLessons(courseId)
    if (pending.length === 0) {
      throw new AppError({
        code: 'COURSE_COMPLETE',
        userMessage: 'Ya completaste todas las lecciones de este curso.'
      })
    }

    // Batch by the course's daily-minutes budget, but always include at
    // least the first pending lesson so a session is never empty even if
    // that one lesson alone exceeds the budget.
    const batch: typeof pending = []
    let total = 0
    for (const lesson of pending) {
      if (batch.length > 0 && total + lesson.estimatedMinutes > course.dailyMinutes) break
      batch.push(lesson)
      total += lesson.estimatedMinutes
    }

    const sessionId = this.sessions.create(
      courseId,
      batch.map((lesson) => ({ lessonId: lesson.lessonId })),
      total
    )
    const detail = this.sessions.getDetail(sessionId)
    if (!detail) {
      throw new Error(
        'Session was just created but could not be re-read — this should never happen.'
      )
    }
    return detail
  }

  completeActivity(activityId: string, understood: boolean): StudySessionDetail {
    const activity = this.sessions.getActivity(activityId)
    if (!activity) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Actividad no encontrada.' })
    }

    if (understood) {
      this.courses.markLessonCompleted(activity.lessonId)
      this.sessions.markActivityCompleted(activityId)
      if (this.sessions.countPendingActivities(activity.sessionId) === 0) {
        this.sessions.completeSession(activity.sessionId)
      }
    } else {
      this.courses.markLessonInProgress(activity.lessonId)
    }

    const detail = this.sessions.getDetail(activity.sessionId)
    if (!detail) {
      throw new Error('Session vanished mid-update — this should never happen.')
    }
    return detail
  }
}
