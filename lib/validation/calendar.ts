import { z } from "zod";

export const FOCUS_CONTEXTS = [
  "deep_work",
  "study",
  "planning",
  "family",
  "exercise",
  "admin",
  "other",
] as const;

const timeRange = {
  startAt: z.string().min(1, "Start time is required."),
  endAt: z.string().min(1, "End time is required."),
};

function endAfterStart(data: { startAt: string; endAt: string }, ctx: z.RefinementCtx) {
  if (new Date(data.endAt).getTime() <= new Date(data.startAt).getTime()) {
    ctx.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
  }
}

export const calendarEventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(300),
    ...timeRange,
    location: z.string().trim().max(300).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .superRefine(endAfterStart);
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

export const timeBlockSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required.").max(300),
    taskId: z.string().uuid().optional().or(z.literal("")),
    projectId: z.string().uuid().optional().or(z.literal("")),
    focusContext: z.enum(FOCUS_CONTEXTS).optional().or(z.literal("")),
    ...timeRange,
  })
  .superRefine(endAfterStart);
export type TimeBlockInput = z.infer<typeof timeBlockSchema>;
