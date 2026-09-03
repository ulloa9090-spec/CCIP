import { z } from "zod";

export const challengeSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  dailyAction: z.string().trim().max(500).optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  goalId: z.string().uuid().optional().or(z.literal("")),
});
export type ChallengeInput = z.infer<typeof challengeSchema>;

export const challengeReflectionSchema = z.object({
  finalScore: z.coerce.number().min(0).max(100).optional(),
  reflections: z.string().trim().max(4000).optional().or(z.literal("")),
});
export type ChallengeReflectionInput = z.infer<typeof challengeReflectionSchema>;
