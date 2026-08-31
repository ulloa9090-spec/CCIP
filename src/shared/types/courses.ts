export type LessonType = 'lesson' | 'practice' | 'assessment'
export type LessonStatus = 'not_started' | 'in_progress' | 'completed'
export type ModuleStatus = 'not_started' | 'in_progress' | 'completed'
/** `completed`/`archived` are written starting Fase 6+; Fase 5 only ever creates `active`. */
export type CourseStatus = 'active' | 'completed' | 'archived'

export type CourseStyle = 'equilibrado' | 'visual' | 'practico' | 'conversacional' | 'examen'

export interface Lesson {
  id: string
  title: string
  position: number
  type: LessonType
  estimatedMinutes: number
  status: LessonStatus
  summary: string | null
}

export interface Module {
  id: string
  title: string
  position: number
  estimatedMinutes: number
  status: ModuleStatus
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  objective: string
  level: string | null
  targetDate: string | null
  dailyMinutes: number
  status: CourseStatus
  progress: number
  createdAt: string
  updatedAt: string
}

export interface CourseDetail extends Course {
  modules: Module[]
  documentIds: string[]
}

export interface CreateCourseInput {
  objective: string
  documentIds: string[]
  durationDays: number
  dailyMinutes: number
  style: CourseStyle
}
