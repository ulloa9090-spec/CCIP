import { z } from "zod";

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const taskOverdueAutomationSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  minDays: z.coerce.number().int().min(1, "Must be at least 1 day.").max(365),
  priorities: z.array(z.enum(TASK_PRIORITIES)).default([]),
});
export type TaskOverdueAutomationInput = z.infer<typeof taskOverdueAutomationSchema>;

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const weeklyScheduleAutomationSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  hour: z.coerce.number().int().min(0).max(23),
});
export type WeeklyScheduleAutomationInput = z.infer<typeof weeklyScheduleAutomationSchema>;
