import type { Migration } from './types'

/**
 * Fase 2 (Biblioteca): `documents` + `document_pages` (DATA_MODEL.md §3, §4).
 * `document_chunks` is NOT created here — it belongs to Fase 3 (Retrieval),
 * per DECISIONS.md ADR-007. `processing_jobs` (§27) is created now because
 * Fase 2 is the first phase with something to queue (PDF extraction).
 */
export const migration0002Documents: Migration = {
  version: 2,
  name: 'documents',
  up: `
    CREATE TABLE documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      local_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      page_count INTEGER,
      status TEXT NOT NULL,
      file_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX idx_documents_file_hash ON documents(file_hash);

    CREATE TABLE document_pages (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      text TEXT NOT NULL,
      heading TEXT,
      metadata_json TEXT
    );

    CREATE INDEX idx_document_pages_document_id ON document_pages(document_id);

    CREATE TABLE processing_jobs (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      error_code TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_processing_jobs_document_id ON processing_jobs(document_id);
  `
}
