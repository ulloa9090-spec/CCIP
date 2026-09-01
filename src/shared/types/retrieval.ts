/** A retrieved chunk with enough context to render a clickable citation (AI_RAG.md §8). */
export interface RetrievalResult {
  chunkId: string
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
  heading: string | null
  text: string
  /** Cosine similarity, roughly 0–1 for normalized embeddings. */
  score: number
}
