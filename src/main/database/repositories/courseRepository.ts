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
}
