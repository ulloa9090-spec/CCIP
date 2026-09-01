import type { FlashcardRating } from '../../shared/types/flashcards'

export const DEFAULT_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3

export interface ScheduleResult {
  intervalDays: number
  easeFactor: number
}

/**
 * SM-2-like scheduling (ROADMAP_IMPLEMENTATION.md Fase 10) — simplified:
 * it doesn't track an explicit repetition counter, inferring "first
 * successful review" vs. "second" vs. "established" from the previous
 * interval's magnitude (0 -> new, 1 -> second, >1 -> established) instead
 * of a separate repetition count. See docs/DECISIONS.md (Fase 10 ADR) for
 * why that's an acceptable simplification of textbook SM-2.
 */
export function computeNextSchedule(
  previousIntervalDays: number,
  previousEaseFactor: number,
  rating: FlashcardRating
): ScheduleResult {
  let easeFactor = previousEaseFactor
  if (rating === 'again') easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2)
  else if (rating === 'hard') easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15)
  else if (rating === 'easy') easeFactor = easeFactor + 0.15
  // 'good' leaves the ease factor unchanged.

  let intervalDays: number
  if (rating === 'again') {
    intervalDays = 1
  } else if (previousIntervalDays === 0) {
    intervalDays = 1
  } else if (previousIntervalDays === 1) {
    intervalDays = 6
  } else {
    intervalDays = Math.round(previousIntervalDays * easeFactor)
  }

  return { intervalDays, easeFactor }
}
