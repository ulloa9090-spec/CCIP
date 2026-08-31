import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type {
  Course,
  CourseDetail,
  CourseStatus,
  Lesson,
  LessonStatus,
  LessonType,
  Module,
  ModuleStatus
} from '../../../shared/types/courses'
import type { CourseStructure } from '../../courses/courseGenerationSchema'

interface CourseRow {
  id: string
  title: string
  objective: string
  level: string | null
  target_date: string | null
  daily_minutes: number
  status: CourseStatus
  progress: number
  created_at: string
  updated_at: string
}

interface ModuleRow {
  id: string
  title: string
  position: number
  estimated_minutes: number
  status: ModuleStatus
}

interface LessonRow {
  id: string
  module_id: string
  title: string
  position: number
  lesson_type: LessonType
  estimated_minutes: number
  status: LessonStatus
  summary: string | null
}

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    level: row.level,
    targetDate: row.target_date,
    dailyMinutes: row.daily_minutes,
    status: row.status,
    progress: row.progress,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export interface CreateCoursePersistInput {
  objective: string
  documentIds: string[]
  targetDate: string | null
  dailyMinutes: number
  structure: CourseStructure
}

export class CourseRepository {
  constructor(private readonly db: Database) {}

  create(input: CreateCoursePersistInput): CourseDetail {
    const now = new Date().toISOString()
    const courseId = ulid()

    const persist = this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO courses
             (id, title, objective, level, target_date, daily_minutes, status, progress, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, 'active', 0, ?, ?)`
        )
        .run(
          courseId,
          input.structure.title,
          input.objective,
          input.targetDate,
          input.dailyMinutes,
          now,
          now
        )

      const insertCourseDocument = this.db.prepare(
        'INSERT INTO course_documents (course_id, document_id) VALUES (?, ?)'
      )
      for (const documentId of input.documentIds) {
        insertCourseDocument.run(courseId, documentId)
      }

      const insertModule = this.db.prepare(
        `INSERT INTO modules (id, course_id, title, position, estimated_minutes, status)
         VALUES (?, ?, ?, ?, ?, 'not_started')`
      )
      const insertLesson = this.db.prepare(
        `INSERT INTO lessons (id, module_id, title, position, lesson_type, estimated_minutes, status, summary)
         VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?)`
      )

      input.structure.modules.forEach((modulePlan, moduleIndex) => {
        const moduleId = ulid()
        const estimatedMinutes = modulePlan.lessons.reduce(
          (sum, lesson) => sum + lesson.estimatedMinutes,
          0
        )
        insertModule.run(moduleId, courseId, modulePlan.title, moduleIndex, estimatedMinutes)

        modulePlan.lessons.forEach((lessonPlan, lessonIndex) => {
          insertLesson.run(
            ulid(),
            moduleId,
            lessonPlan.title,
            lessonIndex,
            lessonPlan.type,
            lessonPlan.estimatedMinutes,
            lessonPlan.summary
          )
        })
      })
    })
    persist()

    const created = this.getById(courseId)
    if (!created) {
      throw new Error(
        'Course was just created but could not be re-read — this should never happen.'
      )
    }
    return created
  }

  list(): Course[] {
    const rows = this.db
      .prepare('SELECT * FROM courses ORDER BY created_at DESC, id DESC')
      .all() as CourseRow[]
    return rows.map(mapCourse)
  }

  getById(id: string): CourseDetail | null {
    const row = this.db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as
      CourseRow | undefined
    if (!row) return null

    const documentIds = (
      this.db.prepare('SELECT document_id FROM course_documents WHERE course_id = ?').all(id) as {
        document_id: string
      }[]
    ).map((r) => r.document_id)

    const moduleRows = this.db
      .prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC')
      .all(id) as ModuleRow[]

    const lessonRows = this.db
      .prepare(
        `SELECT lessons.* FROM lessons
         JOIN modules ON modules.id = lessons.module_id
         WHERE modules.course_id = ?
         ORDER BY lessons.position ASC`
      )
      .all(id) as LessonRow[]

    const lessonsByModule = new Map<string, Lesson[]>()
    for (const lessonRow of lessonRows) {
      const lesson: Lesson = {
        id: lessonRow.id,
        title: lessonRow.title,
        position: lessonRow.position,
        type: lessonRow.lesson_type,
        estimatedMinutes: lessonRow.estimated_minutes,
        status: lessonRow.status,
        summary: lessonRow.summary
      }
      const list = lessonsByModule.get(lessonRow.module_id) ?? []
      list.push(lesson)
      lessonsByModule.set(lessonRow.module_id, list)
    }

    const modules: Module[] = moduleRows.map((moduleRow) => ({
      id: moduleRow.id,
      title: moduleRow.title,
      position: moduleRow.position,
      estimatedMinutes: moduleRow.estimated_minutes,
      status: moduleRow.status,
      lessons: lessonsByModule.get(moduleRow.id) ?? []
    }))

    return { ...mapCourse(row), modules, documentIds }
  }

  /** Ordered by module/lesson position — the order a study session presents them in. */
  listPendingLessons(courseId: string): {
    lessonId: string
    moduleId: string
    title: string
    summary: string | null
    estimatedMinutes: number
  }[] {
    const rows = this.db
      .prepare(
        `SELECT lessons.id as lesson_id, lessons.module_id, lessons.title, lessons.summary,
                lessons.estimated_minutes
         FROM lessons
         JOIN modules ON modules.id = lessons.module_id
         WHERE modules.course_id = ? AND lessons.status != 'completed'
         ORDER BY modules.position ASC, lessons.position ASC`
      )
      .all(courseId) as {
      lesson_id: string
      module_id: string
      title: string
      summary: string | null
      estimated_minutes: number
    }[]

    return rows.map((row) => ({
      lessonId: row.lesson_id,
      moduleId: row.module_id,
      title: row.title,
      summary: row.summary,
      estimatedMinutes: row.estimated_minutes
    }))
  }

  /**
   * Marks a lesson completed and recomputes its module's status and the
   * course's overall progress/status in the same transaction — the
   * aggregate's own repository is where that consistency belongs, not a
   * caller that would otherwise have to know the recomputation rules.
   */
  markLessonCompleted(lessonId: string): void {
    const now = new Date().toISOString()
    const run = this.db.transaction(() => {
      this.db.prepare("UPDATE lessons SET status = 'completed' WHERE id = ?").run(lessonId)

      const lessonRow = this.db
        .prepare('SELECT module_id FROM lessons WHERE id = ?')
        .get(lessonId) as { module_id: string } | undefined
      if (!lessonRow) return
      const moduleId = lessonRow.module_id

      const moduleLessons = this.db
        .prepare('SELECT status FROM lessons WHERE module_id = ?')
        .all(moduleId) as { status: LessonStatus }[]
      const moduleStatus: ModuleStatus = moduleLessons.every((l) => l.status === 'completed')
        ? 'completed'
        : moduleLessons.some((l) => l.status !== 'not_started')
          ? 'in_progress'
          : 'not_started'
      this.db.prepare('UPDATE modules SET status = ? WHERE id = ?').run(moduleStatus, moduleId)

      const moduleRow = this.db
        .prepare('SELECT course_id FROM modules WHERE id = ?')
        .get(moduleId) as { course_id: string } | undefined
      if (!moduleRow) return
      const courseId = moduleRow.course_id

      const allLessons = this.db
        .prepare(
          `SELECT lessons.status FROM lessons
           JOIN modules ON modules.id = lessons.module_id
           WHERE modules.course_id = ?`
        )
        .all(courseId) as { status: LessonStatus }[]
      const completedCount = allLessons.filter((l) => l.status === 'completed').length
      const progress = Math.round((completedCount / allLessons.length) * 100)
      const courseStatus: CourseStatus = progress === 100 ? 'completed' : 'active'
      this.db
        .prepare('UPDATE courses SET progress = ?, status = ?, updated_at = ? WHERE id = ?')
        .run(progress, courseStatus, now, courseId)
    })
    run()
  }

  /** Only escalates `not_started` → `in_progress`; never downgrades a completed lesson. */
  markLessonInProgress(lessonId: string): void {
    this.db
      .prepare("UPDATE lessons SET status = 'in_progress' WHERE id = ? AND status = 'not_started'")
      .run(lessonId)
  }
}
