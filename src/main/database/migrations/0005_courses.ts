import type { Migration } from './types'

/**
 * Fase 5 (Course Engine): `courses`, `course_documents`, `modules`,
 * `lessons` (DATA_MODEL.md §8-11). `concepts`/`lesson_concepts`/
 * `concept_sources` are NOT created here — nothing in Fase 5 has a
 * repository, IPC, or UI for per-concept tracking; that arrives with
 * Mastery (Fase 8) / Knowledge Map (Fase 11), per the same
 * migrate-only-what's-used pattern as ADR-007.
 */
export const migration0005Courses: Migration = {
  version: 5,
  name: 'courses',
  up: `
    CREATE TABLE courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      level TEXT,
      target_date TEXT,
      daily_minutes INTEGER NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE course_documents (
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      PRIMARY KEY (course_id, document_id)
    );

    CREATE TABLE modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE INDEX idx_modules_course_id ON modules(course_id);

    CREATE TABLE lessons (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      lesson_type TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      status TEXT NOT NULL,
      summary TEXT
    );

    CREATE INDEX idx_lessons_module_id ON lessons(module_id);
  `
}
