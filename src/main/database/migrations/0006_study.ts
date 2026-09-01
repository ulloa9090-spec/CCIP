import type { Migration } from './types'

/**
 * Fase 6 (Study Mode): `study_sessions`, `session_activities`
 * (DATA_MODEL.md §15-16) and `notes` (§23). `notes.concept_id` is not
 * created yet — `concepts` itself doesn't exist until Fase 8 (see
 * migration 0005's note on the same pattern, ADR-007); it arrives as an
 * additive column on this same table once Mastery ships, never by editing
 * this migration.
 */
export const migration0006Study: Migration = {
  version: 6,
  name: 'study',
  up: `
    CREATE TABLE study_sessions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      planned_date TEXT,
      started_at TEXT,
      completed_at TEXT,
      estimated_minutes INTEGER NOT NULL,
      actual_minutes INTEGER,
      status TEXT NOT NULL
    );

    CREATE INDEX idx_study_sessions_course_id ON study_sessions(course_id);

    CREATE TABLE session_activities (
      id TEXT PRIMARY KEY,
      study_session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      position INTEGER NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX idx_session_activities_session_id ON session_activities(study_session_id);

    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      body TEXT NOT NULL,
      document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
      page_number INTEGER,
      course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_notes_course_id ON notes(course_id);
  `
}
