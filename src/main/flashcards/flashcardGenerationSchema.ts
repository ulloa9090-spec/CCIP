import { z } from 'zod'

/**
 * Structured-output contract for flashcard generation. Same pattern as
 * `courses/courseGenerationSchema.ts` and `assessment/
 * quizGenerationSchema.ts`: `AIProvider` stays format-agnostic, only this
 * module (and `FlashcardService`, which re-validates the raw result) knows
 * about Zod. The AI is never asked for source citations — those are
 * attached afterwards from real retrieval, same "citations by
 * construction" rule as the Tutor/Assessment (ADR-014/018).
 */
export const flashcardItemSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  hint: z.string().min(1).optional(),
  /** The concept this card tests (Fase 8 — concept tracking), optional and deduplicated by canonical key. */
  concept: z.string().min(1).optional()
})

export const flashcardSetSchema = z.object({
  flashcards: z.array(flashcardItemSchema).min(5).max(20)
})

export type FlashcardSet = z.infer<typeof flashcardSetSchema>

export function flashcardSetJsonSchema(): unknown {
  return z.toJSONSchema(flashcardSetSchema)
}
