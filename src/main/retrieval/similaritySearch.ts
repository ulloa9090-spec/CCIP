export interface EmbeddedChunk {
  chunkId: string
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
  heading: string | null
  text: string
  embedding: Float32Array
}

/**
 * Brute-force cosine similarity — no vector index (ADR-001, decision #4).
 * Correct regardless of whether embeddings are pre-normalized; cheap enough
 * for a personal library (hundreds to low thousands of chunks).
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dot / denominator
}

export interface ScoredChunk extends EmbeddedChunk {
  score: number
}

export function rankBySimilarity(
  queryEmbedding: Float32Array,
  chunks: EmbeddedChunk[],
  topK = 8
): ScoredChunk[] {
  return chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
