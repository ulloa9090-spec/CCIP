import { z } from "zod";

export const JOURNAL_CATEGORIES = [
  "daily_reflection",
  "learning",
  "win",
  "problem",
  "observation",
  "free_note",
] as const;

export const journalEntrySchema = z.object({
  category: z.enum(JOURNAL_CATEGORIES),
  body: z.string().trim().min(1, "Entry can't be empty.").max(10000),
  goalId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  taskId: z.string().uuid().optional().or(z.literal("")),
  decisionId: z.string().uuid().optional().or(z.literal("")),
});
export type JournalEntryInput = z.infer<typeof journalEntrySchema>;
