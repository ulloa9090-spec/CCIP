import { z } from "zod";

export const PROJECT_STATUSES = [
  "active",
  "secondary",
  "waiting",
  "someday",
  "completed",
  "archived",
] as const;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  goalId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUSES),
  startDate: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  targetDate: z.string().optional().or(z.literal("")),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;
