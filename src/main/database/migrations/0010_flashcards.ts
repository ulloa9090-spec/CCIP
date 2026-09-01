import type { Migration } from './types'

/**
 * Fase 10 (Flashcards): `flashcards`, `flashcard_reviews`
 * (DATA_MODEL.md §20-21). A flashcard's current scheduling state
 * (interval/ease/next due date) is never stored on the card itself — it's
 * derived from its most recent `flashcard_reviews` row, same append-only
 * pattern as `assessment_answers` in Fase 7. A brand-new card with zero
 * reviews is simply "due" by definition.
 */
export const migration0010Flashcards: Migration = {
  version: 10,
  name: 'flashcards',
  up: `
    CREATE TABLE flashcards (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      hint TEXT,
      source_refs_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX idx_flashcards_course_id ON flashcards(course_id);

    CREATE TABLE flashcard_reviews (
      id TEXT PRIMARY KEY,
      flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
      reviewed_at TEXT NOT NULL,
      rating TEXT NOT NULL,
      interval_days INTEGER NOT NULL,
      ease_factor REAL NOT NULL,
      next_review_at TEXT NOT NULL
    );

    CREATE INDEX idx_flashcard_reviews_flashcard_id ON flashcard_reviews(flashcard_id);
  `
}
