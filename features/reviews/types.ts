import type { WeeklyMetrics } from "./aggregate";

export type ReviewStatus = "in_progress" | "completed";

export interface WeeklyReview {
  id: string;
  weekStartDate: string;
  status: ReviewStatus;
  autoSummary: WeeklyMetrics | null;
  reflectionCompleted: string | null;
  reflectionMissed: string | null;
  reflectionWhy: string | null;
  reflectionProgress: string | null;
  reflectionTimeWasted: string | null;
  reflectionStopDoing: string | null;
  reflectionLearned: string | null;
  nextWeekMioTaskId: string | null;
  executionScore: number | null;
  createdAt: string;
}

export interface MonthlyAutoSummary {
  tasksCompleted: number;
  focusMinutes: number;
  habitConsistencyAvgPct: number | null;
  avgExecutionScore: number | null;
  weeksReviewed: number;
}

export interface MonthlyReview {
  id: string;
  month: string;
  status: ReviewStatus;
  autoSummary: MonthlyAutoSummary | null;
  wins: string | null;
  failures: string | null;
  lessons: string | null;
  nextMonthPriorities: string | null;
  createdAt: string;
}
