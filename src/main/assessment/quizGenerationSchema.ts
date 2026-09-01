import { z } from 'zod'

/**
 * Structured-output contract for quiz generation. Same pattern as
 * `courses/courseGenerationSchema.ts`: `AIProvider` stays format-agnostic,
 * only this module (and `QuizService`, which re-validates the raw result)
 * knows about Zod. The AI is never asked for source citations — those are
 * attached afterwards from real retrieval, same "citations by
 * construction" rule as the Tutor (ADR-014).
 */
export const quizQuestionSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard'])
})

export const quizSchema = z.object({
  questions: z.array(quizQuestionSchema).min(5).max(15)
})

export type QuizStructure = z.infer<typeof quizSchema>

export function quizJsonSchema(): unknown {
  return z.toJSONSchema(quizSchema)
}
