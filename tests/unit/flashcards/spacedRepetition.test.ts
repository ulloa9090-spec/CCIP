import { describe, expect, it } from 'vitest'
import {
  computeNextSchedule,
  DEFAULT_EASE_FACTOR
} from '../../../src/main/flashcards/spacedRepetition'

describe('computeNextSchedule', () => {
  it('a brand-new card (interval 0) rated good becomes due in 1 day', () => {
    const result = computeNextSchedule(0, DEFAULT_EASE_FACTOR, 'good')
    expect(result).toEqual({ intervalDays: 1, easeFactor: DEFAULT_EASE_FACTOR })
  })

  it('progresses 0 -> 1 -> 6 -> round(prev*ease) across consecutive good reviews', () => {
    const first = computeNextSchedule(0, DEFAULT_EASE_FACTOR, 'good')
    expect(first.intervalDays).toBe(1)

    const second = computeNextSchedule(first.intervalDays, first.easeFactor, 'good')
    expect(second.intervalDays).toBe(6)

    const third = computeNextSchedule(second.intervalDays, second.easeFactor, 'good')
    expect(third.intervalDays).toBe(Math.round(6 * DEFAULT_EASE_FACTOR))
  })

  it('"again" always resets the interval to 1 day regardless of the previous interval', () => {
    expect(computeNextSchedule(0, DEFAULT_EASE_FACTOR, 'again').intervalDays).toBe(1)
    expect(computeNextSchedule(6, DEFAULT_EASE_FACTOR, 'again').intervalDays).toBe(1)
    expect(computeNextSchedule(30, DEFAULT_EASE_FACTOR, 'again').intervalDays).toBe(1)
  })

  it('"again" decreases the ease factor by 0.2, floored at 1.3', () => {
    expect(computeNextSchedule(6, DEFAULT_EASE_FACTOR, 'again').easeFactor).toBeCloseTo(2.3)
    expect(computeNextSchedule(6, 1.4, 'again').easeFactor).toBeCloseTo(1.3)
    expect(computeNextSchedule(6, 1.3, 'again').easeFactor).toBeCloseTo(1.3)
  })

  it('"hard" decreases the ease factor by 0.15, floored at 1.3, but still advances the interval', () => {
    const result = computeNextSchedule(10, DEFAULT_EASE_FACTOR, 'hard')
    expect(result.easeFactor).toBeCloseTo(2.35)
    expect(result.intervalDays).toBe(Math.round(10 * 2.35))

    expect(computeNextSchedule(10, 1.35, 'hard').easeFactor).toBeCloseTo(1.3)
  })

  it('"good" leaves the ease factor unchanged', () => {
    const result = computeNextSchedule(10, DEFAULT_EASE_FACTOR, 'good')
    expect(result.easeFactor).toBe(DEFAULT_EASE_FACTOR)
  })

  it('"easy" increases the ease factor by 0.15 with no ceiling', () => {
    const result = computeNextSchedule(10, DEFAULT_EASE_FACTOR, 'easy')
    expect(result.easeFactor).toBeCloseTo(2.65)
    expect(result.intervalDays).toBe(Math.round(10 * 2.65))
  })

  it('a second review (previous interval 1) always jumps to 6 days regardless of rating (except again)', () => {
    expect(computeNextSchedule(1, DEFAULT_EASE_FACTOR, 'good').intervalDays).toBe(6)
    expect(computeNextSchedule(1, DEFAULT_EASE_FACTOR, 'hard').intervalDays).toBe(6)
    expect(computeNextSchedule(1, DEFAULT_EASE_FACTOR, 'easy').intervalDays).toBe(6)
  })
})
