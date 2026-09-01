import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type { DocumentChunkDraft } from '../../retrieval/chunkPages'
import type { EmbeddedChunk } from '../../retrieval/similaritySearch'

interface DocumentChunkRow {
  id: string
  document_id: string
  document_title: string
  page_start: number
  page_end: number
  heading: string | null
  text: string
  embedding_ref: Buffer
}

function toEmbeddedChunk(row: DocumentChunkRow): EmbeddedChunk {
  return {
    chunkId: row.id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    pageStart: row.page_start,
    pageEnd: row.page_end,
    heading: row.heading,
    text: row.text,
    embedding: bufferToFloat32Array(row.embedding_ref)
  }
}

function float32ArrayToBuffer(values: number[]): Buffer {
  return Buffer.from(Float32Array.from(values).buffer)
}

function bufferToFloat32Array(buffer: Buffer): Float32Array {
  return new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  )
}

export class DocumentChunkRepository {
  constructor(private readonly db: Database) {}

  replaceChunks(
    documentId: string,
    chunks: (DocumentChunkDraft & { embedding: number[] })[]
  ): void {
    const replace = this.db.transaction(() => {
      this.db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(documentId)
      const insert = this.db.prepare(
        `INSERT INTO document_chunks
           (id, document_id, page_start, page_end, heading, text, token_count, embedding_ref, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`
      )
      for (const chunk of chunks) {
        insert.run(
          ulid(),
          documentId,
          chunk.pageStart,
          chunk.pageEnd,
          chunk.heading,
          chunk.text,
          chunk.tokenCount,
          float32ArrayToBuffer(chunk.embedding)
        )
      }
    })
    replace()
  }

  countByDocument(documentId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) as count FROM document_chunks WHERE document_id = ?')
      .get(documentId) as { count: number }
    return row.count
  }

  /** Scoped to `documentIds` when given, otherwise every ready document's chunks. */
  getEmbeddedChunks(documentIds?: string[]): EmbeddedChunk[] {
    const baseQuery = `
      SELECT document_chunks.id, document_chunks.document_id, documents.title as document_title,
             document_chunks.page_start, document_chunks.page_end, document_chunks.heading,
             document_chunks.text, document_chunks.embedding_ref
      FROM document_chunks
      JOIN documents ON documents.id = document_chunks.document_id
    `
    const rows = (
      documentIds && documentIds.length > 0
        ? this.db
            .prepare(
              `${baseQuery} WHERE document_chunks.document_id IN (${documentIds.map(() => '?').join(',')})`
            )
            .all(...documentIds)
        : this.db.prepare(baseQuery).all()
    ) as DocumentChunkRow[]

    return rows.map(toEmbeddedChunk)
  }
}
