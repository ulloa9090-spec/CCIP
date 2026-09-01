import type { Migration } from './types'

/**
 * Fase 3 (Retrieval): `document_chunks` (DATA_MODEL.md §5). Per ADR-001
 * (decision #4), embeddings are stored inline as a BLOB — `embedding_ref`
 * holds the raw Float32Array bytes directly, not a pointer to an external
 * file or table.
 */
export const migration0003DocumentChunks: Migration = {
  version: 3,
  name: 'document_chunks',
  up: `
    CREATE TABLE document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      page_start INTEGER NOT NULL,
      page_end INTEGER NOT NULL,
      heading TEXT,
      text TEXT NOT NULL,
      token_count INTEGER NOT NULL,
      embedding_ref BLOB NOT NULL,
      metadata_json TEXT
    );

    CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
  `
}
