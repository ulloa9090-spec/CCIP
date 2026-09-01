import { AppError } from '../../shared/types/errors'
import type { CourseRepository } from '../database/repositories/courseRepository'
import type {
  PlanDayEntry,
  PlanRepository,
  StoredPlan
} from '../database/repositories/planRepository'
import type {
  PlannedDay,
  PlannedDayStatus,
  RecalculatePlanInput,
  StudyPlan
} from '../../shared/types/plan'

const DEFAULT_PLAN_HORIZON_DAYS = 30

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function enumerateDates(startDate: string, targetDate: string): string[] {
  const dates: string[] = []
  let cursor = startDate
  while (cursor <= targetDate) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates.length > 0 ? dates : [startDate]
}

interface PendingLesson {
  lessonId: string
  title: string
  estimatedMinutes: number
}

/**
 * Greedy bin-packing by day: fills each day up to `dailyMinutes` before
 * moving to the next, in the course's existing lesson order. Deliberately
 * not reordered by mastery/priority — see docs/DECISIONS.md (Fase 9 ADR).
 * Any lessons left over once the calendar runs out pile onto the last day
 * (surfaced via `feasible: false` in the returned plan, not silently lost).
 */
function distribute(
  pending: PendingLesson[],
  startDate: string,
  targetDate: string,
  dailyMinutes: number
): PlanDayEntry[] {
  const dates = enumerateDates(startDate, targetDate)
  const days: PlanDayEntry[] = dates.map((date) => ({ date, lessonIds: [], estimatedMinutes: 0 }))

  let dayIndex = 0
  for (const lesson of pending) {
    while (
      dayIndex < days.length - 1 &&
      days[dayIndex].estimatedMinutes > 0 &&
      days[dayIndex].estimatedMinutes + lesson.estimatedMinutes > dailyMinutes
    ) {
      dayIndex++
    }
    days[dayIndex].lessonIds.push(lesson.lessonId)
    days[dayIndex].estimatedMinutes += lesson.estimatedMinutes
  }

  return days.filter((day) => day.lessonIds.length > 0)
}

/**
 * Computes and persists a course's schedule (ROADMAP_IMPLEMENTATION.md
 * Fase 9): no AI involved, deterministic from the course's own pending
 * lessons — same offline-first property as Study Mode (Fase 6) and
 * Mastery (Fase 8). Deliberately decoupled from `StudySessionService`:
 * the plan is an advisory calendar projection, not the mechanism that
 * decides what a session actually contains (see ADR).
 */
export class PlanService {
  constructor(
    private readonly courses: CourseRepository,
    private readonly plans: PlanRepository
  ) {}

  getPlan(courseId: string): StudyPlan {
    const course = this.requireCourse(courseId)
    const stored =
      this.plans.getLatest(courseId) ??
      this.buildAndPersist(courseId, course.targetDate, course.dailyMinutes)
    return this.toStudyPlan(stored, course.title)
  }

  recalculate(courseId: string, input: RecalculatePlanInput): StudyPlan {
    const course = this.requireCourse(courseId)
    const targetDate =
      input.targetDate ?? course.targetDate ?? addDays(todayISO(), DEFAULT_PLAN_HORIZON_DAYS)
    const dailyMinutes = input.dailyMinutes ?? course.dailyMinutes

    if (input.targetDate || input.dailyMinutes) {
      this.courses.updateSchedule(courseId, targetDate, dailyMinutes)
    }

    const stored = this.buildAndPersist(courseId, targetDate, dailyMinutes)
    return this.toStudyPlan(stored, course.title)
  }

  private requireCourse(courseId: string): NonNullable<ReturnType<CourseRepository['getById']>> {
    const course = this.courses.getById(courseId)
    if (!course) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Curso no encontrado.' })
    }
    return course
  }

  private buildAndPersist(
    courseId: string,
    targetDate: string | null,
    dailyMinutes: number
  ): StoredPlan {
    const startDate = todayISO()
    const resolvedTargetDate =
      targetDate && targetDate >= startDate
        ? targetDate
        : addDays(startDate, DEFAULT_PLAN_HORIZON_DAYS)
    const pending = this.courses.listPendingLessons(courseId)
    const days = distribute(pending, startDate, resolvedTargetDate, dailyMinutes)
    return this.plans.create(courseId, startDate, resolvedTargetDate, dailyMinutes, days)
  }

  private toStudyPlan(stored: StoredPlan, courseTitle: string): StudyPlan {
    const lessonIds = stored.days.flatMap((day) => day.lessonIds)
    const lessons = this.courses.getLessonsByIds(lessonIds)
    const lessonById = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]))
    const statusById = this.courses.getLessonStatuses(lessonIds)
    const today = todayISO()

    const days: PlannedDay[] = stored.days.map((day) => {
      const dayLessons = day.lessonIds.map((lessonId) => ({
        lessonId,
        title: lessonById.get(lessonId)?.title ?? '',
        estimatedMinutes: lessonById.get(lessonId)?.estimatedMinutes ?? 0,
        completed: statusById.get(lessonId) === 'completed'
      }))
      const allCompleted = dayLessons.every((lesson) => lesson.completed)

      let status: PlannedDayStatus
      if (allCompleted) status = 'completed'
      else if (day.date < today) status = 'missed'
      else if (day.date === today) status = 'today'
      else status = 'upcoming'

      return { date: day.date, status, estimatedMinutes: day.estimatedMinutes, lessons: dayLessons }
    })

    const totalPendingMinutes = days
      .filter((day) => day.status !== 'completed')
      .reduce((sum, day) => sum + day.estimatedMinutes, 0)
    const availableDays = enumerateDates(stored.startDate, stored.targetDate).length
    const feasible = totalPendingMinutes <= availableDays * stored.dailyMinutes

    return {
      id: stored.id,
      courseId: stored.courseId,
      courseTitle,
      version: stored.version,
      startDate: stored.startDate,
      targetDate: stored.targetDate,
      dailyMinutes: stored.dailyMinutes,
      feasible,
      days
    }
  }
}
