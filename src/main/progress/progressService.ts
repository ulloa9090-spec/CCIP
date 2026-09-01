import type { CourseRepository } from '../database/repositories/courseRepository'
import type { StudySessionRepository } from '../database/repositories/studySessionRepository'
import type { AssessmentRepository } from '../database/repositories/assessmentRepository'
import type { FlashcardRepository } from '../database/repositories/flashcardRepository'
import type { MasteryService } from '../mastery/masteryService'
import type {
  ConceptAtRisk,
  CourseMasterySummary,
  ProgressSummary
} from '../../shared/types/progress'

const STUDY_MINUTES_WINDOW_DAYS = 7
/** Safety bound so a corrupted/huge `study_sessions` history can never spin computeStreak() forever. */
const MAX_STREAK_LOOKBACK_DAYS = 3650

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Counts consecutive calendar days with at least one completed study
 * session, walking backwards from today. If today has no session yet the
 * streak isn't broken — it just hasn't been extended yet — so the walk
 * starts from yesterday in that case, same "still alive until the day
 * ends" rule as any daily-streak feature.
 */
export function computeStreak(completedDates: Set<string>, today: Date): number {
  const cursor = new Date(today)
  if (!completedDates.has(toISODate(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  let streak = 0
  while (completedDates.has(toISODate(cursor)) && streak < MAX_STREAK_LOOKBACK_DAYS) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

/**
 * Aggregates the Progreso dashboard (ROADMAP_IMPLEMENTATION.md Fase 11)
 * across every course — unlike Mastery (Fase 8), which is scoped per
 * course, this is the one place that reads across all of them at once.
 * Every number here is derived from data already persisted by earlier
 * phases (Study Mode, Assessment, Mastery, Flashcards) — no new tracking
 * table, see docs/DECISIONS.md (Fase 11 ADR).
 */
export class ProgressService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly sessions: StudySessionRepository,
    private readonly assessments: AssessmentRepository,
    private readonly flashcards: FlashcardRepository,
    private readonly mastery: MasteryService
  ) {}

  getSummary(): ProgressSummary {
    const allCourses = this.courses.list()
    const activeCourses = allCourses.filter((course) => course.status === 'active')
    const completedCourses = allCourses.filter((course) => course.status === 'completed')

    const courseMastery: CourseMasterySummary[] = []
    const conceptsAtRisk: ConceptAtRisk[] = []
    for (const course of allCourses) {
      const detail = this.mastery.getCourseMastery(course.id)
      if (detail.concepts.length === 0) continue
      courseMastery.push({
        courseId: course.id,
        courseTitle: course.title,
        averageScore: average(detail.concepts.map((concept) => concept.score))
      })
      for (const weak of detail.weakConcepts) {
        conceptsAtRisk.push({
          courseId: course.id,
          courseTitle: course.title,
          conceptId: weak.conceptId,
          title: weak.title,
          score: weak.score,
          state: weak.state
        })
      }
    }
    conceptsAtRisk.sort((a, b) => {
      if (a.state !== b.state) return a.state === 'learning' ? -1 : 1
      return a.score - b.score
    })

    const examHistory = this.assessments.listHistory()
    const quizAccuracy = examHistory.length > 0 ? average(examHistory.map((e) => e.score)) : null

    const reviewStats = this.flashcards.getReviewStats()
    const flashcardAccuracy =
      reviewStats.total > 0 ? Math.round((reviewStats.positive / reviewStats.total) * 100) : null

    const now = new Date()
    const windowStart = new Date(now)
    windowStart.setUTCDate(windowStart.getUTCDate() - STUDY_MINUTES_WINDOW_DAYS)

    return {
      activeCourseCount: activeCourses.length,
      completedCourseCount: completedCourses.length,
      averageProgress: average(activeCourses.map((course) => course.progress)),
      totalStudyMinutes: this.sessions.getTotalActualMinutes(),
      studyMinutesLast7Days: this.sessions.getActualMinutesSince(toISODate(windowStart)),
      quizAccuracy,
      flashcardAccuracy,
      currentStreakDays: computeStreak(new Set(this.sessions.getCompletedDates()), now),
      courseMastery,
      conceptsAtRisk,
      examHistory
    }
  }
}
