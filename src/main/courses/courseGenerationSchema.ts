import { z } from 'zod'

/**
 * Structured-output contract for course generation (AI_RAG.md §12,
 * "generación estructurada"). `AIProvider.generateStructured` itself stays
 * format-agnostic (`schema: unknown`) — this module is the one place that
 * knows about Zod, converts to plain JSON Schema for the transport, and
 * re-validates the raw result on the way back in. See docs/DECISIONS.md
 * (Fase 5 ADR).
 */
export const lessonPlanSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['lesson', 'practice', 'assessment']),
  estimatedMinutes: z.number().int().positive(),
  summary: z.string().min(1)
})

export const modulePlanSchema = z.object({
  title: z.string().min(1),
  lessons: z.array(lessonPlanSchema).min(1)
})

export const courseStructureSchema = z.object({
  title: z.string().min(1),
  modules: z.array(modulePlanSchema).min(1)
})

export type CourseStructure = z.infer<typeof courseStructureSchema>

/**
 * OpenAI's strict structured-outputs mode requires `additionalProperties:
 * false` on every object, which `z.toJSONSchema` already produces for plain
 * `z.object()` schemas (Zod v4) — verified against a real
 * `chat.completions.create({ response_format: { type: 'json_schema', ... }
 * })` payload shape before wiring this in.
 */
export function courseStructureJsonSchema(): unknown {
  return z.toJSONSchema(courseStructureSchema)
}
