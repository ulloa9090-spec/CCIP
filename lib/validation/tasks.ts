import { z } from "zod";

export const TASK_STATUSES = [
  "inbox",
  "next",
  "today",
  "in_progress",
  "waiting",
  "done",
  "cancelled",
] as const;

export const TASK_PRIORITIES = ["critical", "high", "medium", "low"] as const;

export const KANBAN_COLUMNS = [
  { status: "inbox", label: "Backlog" },
  { status: "next", label: "This Week" },
  { status: "today", label: "Today" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  goalId: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string().optional().or(z.literal("")),
  scheduledDate: z.string().optional().or(z.literal("")),
});
export type TaskInput = z.infer<typeof taskSchema>;
