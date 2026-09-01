import type { DocumentChunkRepository } from '../database/repositories/documentChunkRepository'
import type { EmbeddingProvider } from '../../shared/types/ai'
import type { RetrievalResult } from '../../shared/types/retrieval'
import { rankBySimilarity } from './similaritySearch'

export class RetrievalService {
  constructor(
    private readonly chunks: DocumentChunkRepository,
    private readonly embeddings: EmbeddingProvider
  ) {}

  async search(query: string, documentIds?: string[], topK = 8): Promise<RetrievalResult[]> {
    const trimmed = query.trim()
    if (!trimmed) return []

    const candidates = this.chunks.getEmbeddedChunks(documentIds)
    if (candidates.length === 0) return []

    const [queryEmbedding] = await this.embeddings.embed([trimmed])
    const ranked = rankBySimilarity(Float32Array.from(queryEmbedding), candidates, topK)

    return ranked.map((chunk) => ({
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      heading: chunk.heading,
      text: chunk.text,
      score: chunk.score
    }))
  }
}
