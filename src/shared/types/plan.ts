export type PlannedDayStatus = 'completed' | 'missed' | 'today' | 'upcoming'

export interface PlannedLesson {
  lessonId: string
  title: string
  estimatedMinutes: number
  completed: boolean
}

export interface PlannedDay {
  date: string
  status: PlannedDayStatus
  estimatedMinutes: number
  lessons: PlannedLesson[]
}

export interface StudyPlan {
  id: string
  courseId: string
  courseTitle: string
  version: number
  startDate: string
  targetDate: string
  dailyMinutes: number
  /** False when the pending workload can't fit between today and targetDate at dailyMinutes/day. */
  feasible: boolean
  days: PlannedDay[]
}

export interface RecalculatePlanInput {
  targetDate?: string
  dailyMinutes?: number
}
