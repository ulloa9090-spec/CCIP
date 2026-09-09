import type { Migration } from './types'

/**
 * Fase 13 (Developer Diagnostics): makes the document-to-answer pipeline
 * traceable end to end without reading terminal logs or opening SQLite by
 * hand. Three new tables, plus one additive column on the existing
 * `processing_jobs` (Fase 2) so indexing failures that today are only a
 * transient IPC event become inspectable after the fact. See
 * docs/DECISIONS.md ADR-024 for why there's no numeric similarity
 * threshold column here — Closed Library Mode's real gating logic today
 * has no such threshold, and this phase deliberately doesn't invent one.
 */
export const migration0011Diagnostics: Migration = {
  version: 11,
  name: 'diagnostics',
  up: `
    ALTER TABLE processing_jobs ADD COLUMN stage TEXT;

    CREATE TABLE diagnostic_requests (
      id TEXT PRIMARY KEY,
      feature TEXT NOT NULL,
      conversation_id TEXT,
      question TEXT,
      status TEXT NOT NULL,
      abstention_reason TEXT,
      best_similarity_score REAL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_ms INTEGER
    );

    CREATE INDEX idx_diagnostic_requests_started_at ON diagnostic_requests(started_at);
    CREATE INDEX idx_diagnostic_requests_feature ON diagnostic_requests(feature);

    CREATE TABLE diagnostic_events (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL REFERENCES diagnostic_requests(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      offset_ms INTEGER NOT NULL,
      duration_ms INTEGER,
      metadata_json TEXT
    );

    CREATE INDEX idx_diagnostic_events_request_id ON diagnostic_events(request_id);

    CREATE TABLE ai_usage_records (
      id TEXT PRIMARY KEY,
      request_id TEXT REFERENCES diagnostic_requests(id) ON DELETE SET NULL,
      feature TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      estimated_cost REAL,
      status TEXT NOT NULL,
      error_code TEXT,
      latency_ms INTEGER,
      first_token_ms INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE INDEX idx_ai_usage_records_created_at ON ai_usage_records(created_at);
    CREATE INDEX idx_ai_usage_records_feature ON ai_usage_records(feature);
  `
}
