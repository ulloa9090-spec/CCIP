import type { MasteryState } from './mastery'
import type { AssessmentHistoryEntry } from './assessment'

export interface CourseMasterySummary {
  courseId: string
  courseTitle: string
  averageScore: number
}

export interface ConceptAtRisk {
  courseId: string
  courseTitle: string
  conceptId: string
  title: string
  score: number
  state: MasteryState
}

export interface ProgressSummary {
  activeCourseCount: number
  completedCourseCount: number
  averageProgress: number
  totalStudyMinutes: number
  studyMinutesLast7Days: number
  quizAccuracy: number | null
  flashcardAccuracy: number | null
  currentStreakDays: number
  courseMastery: CourseMasterySummary[]
  conceptsAtRisk: ConceptAtRisk[]
  examHistory: AssessmentHistoryEntry[]
}
