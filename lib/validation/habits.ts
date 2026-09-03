import { z } from "zod";

export const HABIT_FREQUENCIES = ["daily", "weekdays", "weekly", "custom"] as const;

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  frequency: z.enum(HABIT_FREQUENCIES),
  customDays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  target: z.coerce.number().int().min(1).max(20).optional(),
  goalId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
});
export type HabitInput = z.infer<typeof habitSchema>;
