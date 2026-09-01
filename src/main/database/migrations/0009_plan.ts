import type { Migration } from './types'

/**
 * Fase 9 (Plan adaptativo): `study_plans` (DATA_MODEL.md §24). Each
 * recalculation persists a new version rather than overwriting the
 * previous one — a plan is a point-in-time projection, not a single
 * mutable row, so history is preserved for free.
 */
export const migration0009Plan: Migration = {
  version: 9,
  name: 'plan',
  up: `
    CREATE TABLE study_plans (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      daily_minutes INTEGER NOT NULL,
      plan_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX idx_study_plans_course_id ON study_plans(course_id);
  `
}
