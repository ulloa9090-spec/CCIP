import type { Migration } from './types'

/**
 * Fase 8 (Mastery): `concepts`, `lesson_concepts`, `concept_sources`,
 * `mastery_scores` (DATA_MODEL.md §12-14, §22). `concepts` is global (not
 * course-scoped) and deduplicated by `canonical_key` — the same concept
 * mentioned by lessons in two different courses is one row, which is what
 * lets `mastery_scores` track it per (concept, course) pair.
 *
 * `questions.concept_id` and `notes.concept_id` are added here as additive
 * columns — both tables were deliberately created without them in Fase 6/7
 * (ADR-017/018) because `concepts` didn't exist yet.
 */
export const migration0008Mastery: Migration = {
  version: 8,
  name: 'mastery',
  up: `
    CREATE TABLE concepts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      canonical_key TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE lesson_concepts (
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      importance TEXT NOT NULL,
      PRIMARY KEY (lesson_id, concept_id)
    );

    CREATE INDEX idx_lesson_concepts_concept_id ON lesson_concepts(concept_id);

    CREATE TABLE concept_sources (
      concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      document_chunk_id TEXT NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
      relevance REAL NOT NULL,
      PRIMARY KEY (concept_id, document_chunk_id)
    );

    CREATE TABLE mastery_scores (
      id TEXT PRIMARY KEY,
      concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      state TEXT NOT NULL,
      evidence_count INTEGER NOT NULL,
      last_updated TEXT NOT NULL,
      UNIQUE (concept_id, course_id)
    );

    CREATE INDEX idx_mastery_scores_course_id ON mastery_scores(course_id);

    ALTER TABLE questions ADD COLUMN concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL;
    ALTER TABLE notes ADD COLUMN concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL;
  `
}
