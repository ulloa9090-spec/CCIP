import { z } from "zod";

export const weeklyReflectionSchema = z.object({
  reflectionCompleted: z.string().trim().max(2000).optional().or(z.literal("")),
  reflectionMissed: z.string().trim().max(2000).optional().or(z.literal("")),
  reflectionWhy: z.string().trim().max(2000).optional().or(z.literal("")),
  reflectionProgress: z.string().trim().max(2000).optional().or(z.literal("")),
  reflectionTimeWasted: z.string().trim().max(2000).optional().or(z.literal("")),
  reflectionStopDoing: z.string().trim().max(2000).optional().or(z.literal("")),
  reflectionLearned: z.string().trim().max(2000).optional().or(z.literal("")),
  nextWeekMioTaskId: z.string().uuid().optional().or(z.literal("")),
});
export type WeeklyReflectionInput = z.infer<typeof weeklyReflectionSchema>;

export const monthlyReflectionSchema = z.object({
  wins: z.string().trim().max(4000).optional().or(z.literal("")),
  failures: z.string().trim().max(4000).optional().or(z.literal("")),
  lessons: z.string().trim().max(4000).optional().or(z.literal("")),
  nextMonthPriorities: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type MonthlyReflectionInput = z.infer<typeof monthlyReflectionSchema>;
