import { z } from "zod";

export const FOCUS_DURATION_PRESETS = [25, 30, 45, 60, 90] as const;

export const focusSessionSchema = z.object({
  taskId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  context: z.string().trim().max(200).nullable().optional(),
  plannedMinutes: z.number().int().min(1).max(480).nullable().optional(),
  actualMinutes: z.number().int().min(1).max(480),
  startedAt: z.string().min(1),
  note: z.string().trim().max(1000).nullable().optional(),
});
export type FocusSessionInput = z.infer<typeof focusSessionSchema>;
