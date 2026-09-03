import { z } from "zod";

export const IDEA_STATUSES = ["new", "review_later", "evaluating", "promoted", "rejected", "archived"] as const;

export const ideaSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(300),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  status: z.enum(IDEA_STATUSES).optional(),
  impact: z.coerce.number().int().min(1).max(5).optional(),
  effort: z.coerce.number().int().min(1).max(5).optional(),
  urgency: z.coerce.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  reviewDate: z.string().optional().or(z.literal("")),
});
export type IdeaInput = z.infer<typeof ideaSchema>;

export const promoteIdeaSchema = z.object({
  projectStatus: z.enum(["active", "secondary", "waiting", "someday"]),
});
export type PromoteIdeaInput = z.infer<typeof promoteIdeaSchema>;
