import type { Migration } from './types'

/**
 * Fase 7 (Assessment): `questions`, `assessment_attempts`,
 * `assessment_answers` (DATA_MODEL.md §17-19). `questions.concept_id` is
 * not created yet — same additive-column-later pattern as `notes` in
 * migration 0006 (`concepts` doesn't exist until Fase 8).
 *
 * `assessment_answers.answer_json`/`is_correct` are nullable, a deliberate
 * reinterpretation: DATA_MODEL.md has no `attempt_questions` join table, so
 * a row is inserted for every question the moment an attempt is created
 * (unanswered, both NULL) and filled in as the user actually answers —
 * this table doubles as the attempt's question manifest instead of adding
 * a table DATA_MODEL doesn't define. See docs/DECISIONS.md (Fase 7 ADR).
 */
export const migration0007Assessment: Migration = {
  version: 7,
  name: 'assessment',
  up: `
    CREATE TABLE questions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      choices_json TEXT NOT NULL,
      correct_answer_json TEXT NOT NULL,
      explanation TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      source_refs_json TEXT
    );

    CREATE INDEX idx_questions_course_id ON questions(course_id);

    CREATE TABLE assessment_attempts (
      id TEXT PRIMARY KEY,
      assessment_type TEXT NOT NULL,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      score INTEGER,
      total_questions INTEGER NOT NULL,
      correct_count INTEGER,
      duration_seconds INTEGER
    );

    CREATE INDEX idx_assessment_attempts_course_id ON assessment_attempts(course_id);

    CREATE TABLE assessment_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      answer_json TEXT,
      is_correct INTEGER,
      response_time_ms INTEGER,
      confidence_optional TEXT
    );

    CREATE INDEX idx_assessment_answers_attempt_id ON assessment_answers(attempt_id);
    CREATE UNIQUE INDEX idx_assessment_answers_attempt_question
      ON assessment_answers(attempt_id, question_id);
  `
}
