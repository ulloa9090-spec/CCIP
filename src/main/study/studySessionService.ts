import { AppError } from '../../shared/types/errors'
import type { CourseRepository } from '../database/repositories/courseRepository'
import type { StudySessionRepository } from '../database/repositories/studySessionRepository'
import type { ConceptRepository } from '../database/repositories/conceptRepository'
import type { MasteryService } from '../mastery/masteryService'
import type { StudySessionDetail } from '../../shared/types/study'

/**
 * Orchestrates session generation/resume (ROADMAP_IMPLEMENTATION.md Fase 6)
 * and remediation (Fase 8): no AI calls anywhere in this class. A study
 * session is deterministically built from the course's already-persisted
 * lessons (Fase 5), so it works fully offline and needs no
 * network-dependent verification — unlike the Course Engine or Tutor. See
 * docs/DECISIONS.md (Fase 6/8 ADRs).
 */
export class StudySessionService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly sessions: StudySessionRepository,
    private readonly concepts: ConceptRepository,
    private readonly mastery: MasteryService
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

    const batch = batchByDailyMinutes(pending, course.dailyMinutes)
    const sessionId = this.sessions.create(
      courseId,
      batch.map((lesson) => ({ lessonId: lesson.lessonId })),
      batch.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0)
    )
    return this.mustGetDetail(sessionId)
  }

  /**
   * Builds a session covering the course's weakest concepts, regardless of
   * whether their lessons were already completed — a targeted re-study
   * session, not a continuation of the regular pending-lesson queue. Reuses
   * the exact same session/activity machinery as `startOrResume`, tagged
   * `'review'` so it's distinguishable in `session_activities.activity_type`.
   */
  startRemediation(courseId: string): StudySessionDetail {
    const course = this.courses.getById(courseId)
    if (!course) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Curso no encontrado.' })
    }

    const weakConcepts = this.mastery.getCourseMastery(courseId).weakConcepts
    const lessonIds = new Set<string>()
    for (const concept of weakConcepts) {
      for (const lessonId of this.concepts.getLessonIdsForConcept(courseId, concept.conceptId)) {
        lessonIds.add(lessonId)
      }
    }
    const lessons = this.courses.getLessonsByIds([...lessonIds])
    if (lessons.length === 0) {
      throw new AppError({
        code: 'NO_WEAK_CONCEPTS',
        userMessage: 'Todavía no hay suficiente evidencia para armar una sesión de recuperación.'
      })
    }

    const batch = batchByDailyMinutes(lessons, course.dailyMinutes)
    const sessionId = this.sessions.create(
      courseId,
      batch.map((lesson) => ({ lessonId: lesson.lessonId })),
      batch.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0),
      'review'
    )
    return this.mustGetDetail(sessionId)
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
    this.mastery.recordLessonEvidence(activity.courseId, activity.lessonId, understood)

    return this.mustGetDetail(activity.sessionId)
  }

  private mustGetDetail(sessionId: string): StudySessionDetail {
    const detail = this.sessions.getDetail(sessionId)
    if (!detail) {
      throw new Error('Session vanished mid-update — this should never happen.')
    }
    return detail
  }
}

interface BatchableLesson {
  lessonId: string
  estimatedMinutes: number
}

/**
 * Groups lessons up to a daily-minutes budget, always including at least
 * the first one so a session is never empty even if it alone exceeds the
 * budget. Shared by `startOrResume` and `startRemediation`.
 */
function batchByDailyMinutes<T extends BatchableLesson>(lessons: T[], dailyMinutes: number): T[] {
  const batch: T[] = []
  let total = 0
  for (const lesson of lessons) {
    if (batch.length > 0 && total + lesson.estimatedMinutes > dailyMinutes) break
    batch.push(lesson)
    total += lesson.estimatedMinutes
  }
  return batch
}
