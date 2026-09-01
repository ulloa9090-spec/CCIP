import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DocumentRepository } from '../../../src/main/database/repositories/documentRepository'
import { DocumentChunkRepository } from '../../../src/main/database/repositories/documentChunkRepository'
import { RetrievalService } from '../../../src/main/retrieval/retrievalService'
import type { EmbeddingProvider } from '../../../src/shared/types/ai'

/** Deterministic "embedding": maps a known keyword to a known direction. */
function keywordEmbeddingProvider(): EmbeddingProvider {
  return {
    id: 'keyword-fake',
    dimensions: 2,
    embed: async (texts) =>
      texts.map((text) => (text.toLowerCase().includes('concrete') ? [1, 0] : [0, 1]))
  }
}

let db: Database.Database
let documents: DocumentRepository
let chunkRepository: DocumentChunkRepository
let service: RetrievalService

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  documents = new DocumentRepository(db)
  chunkRepository = new DocumentChunkRepository(db)
  service = new RetrievalService(chunkRepository, keywordEmbeddingProvider())
})

describe('RetrievalService', () => {
  it('returns empty for a blank query without touching the embedding provider', async () => {
    expect(await service.search('   ')).toEqual([])
  })

  it('returns empty when the library has no chunks yet', async () => {
    expect(await service.search('concrete basics')).toEqual([])
  })

  it('ranks chunks matching the query above unrelated ones, with citation info attached', async () => {
    const doc = documents.create({
      title: 'Michigan Builder Manual',
      originalFilename: 'manual.pdf',
      mimeType: 'application/pdf',
      fileHash: 'h1'
    })
    chunkRepository.replaceChunks(doc.id, [
      {
        text: 'Concrete foundations require proper curing.',
        pageStart: 4,
        pageEnd: 5,
        heading: 'Concrete',
        tokenCount: 20,
        embedding: [1, 0]
      },
      {
        text: 'Electrical grounding rules for residential wiring.',
        pageStart: 40,
        pageEnd: 40,
        heading: 'Electrical',
        tokenCount: 20,
        embedding: [0, 1]
      }
    ])

    const results = await service.search('concrete curing question')

    expect(results[0].documentId).toBe(doc.id)
    expect(results[0].documentTitle).toBe('Michigan Builder Manual')
    expect(results[0].heading).toBe('Concrete')
    expect(results[0].pageStart).toBe(4)
    expect(results[0].pageEnd).toBe(5)
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('scopes results to the given document ids', async () => {
    const included = documents.create({
      title: 'Included',
      originalFilename: 'a.pdf',
      mimeType: 'application/pdf',
      fileHash: 'ha'
    })
    const excluded = documents.create({
      title: 'Excluded',
      originalFilename: 'b.pdf',
      mimeType: 'application/pdf',
      fileHash: 'hb'
    })
    chunkRepository.replaceChunks(included.id, [
      {
        text: 'concrete',
        pageStart: 1,
        pageEnd: 1,
        heading: null,
        tokenCount: 1,
        embedding: [1, 0]
      }
    ])
    chunkRepository.replaceChunks(excluded.id, [
      {
        text: 'concrete too',
        pageStart: 1,
        pageEnd: 1,
        heading: null,
        tokenCount: 1,
        embedding: [1, 0]
      }
    ])

    const results = await service.search('concrete', [included.id])

    expect(results).toHaveLength(1)
    expect(results[0].documentId).toBe(included.id)
  })
})
