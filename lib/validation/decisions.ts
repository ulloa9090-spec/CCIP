import { z } from "zod";

export const decisionSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(300),
  context: z.string().trim().max(4000).optional().or(z.literal("")),
  options: z.string().trim().max(4000).optional().or(z.literal("")),
  chosenOption: z.string().trim().max(500).optional().or(z.literal("")),
  reasoning: z.string().trim().max(4000).optional().or(z.literal("")),
  expectedOutcome: z.string().trim().max(2000).optional().or(z.literal("")),
  reviewDate: z.string().optional().or(z.literal("")),
  goalId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  taskId: z.string().uuid().optional().or(z.literal("")),
});
export type DecisionInput = z.infer<typeof decisionSchema>;

export const resolveDecisionSchema = z.object({
  actualOutcome: z.string().trim().min(1, "What actually happened?").max(2000),
  lesson: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type ResolveDecisionInput = z.infer<typeof resolveDecisionSchema>;
