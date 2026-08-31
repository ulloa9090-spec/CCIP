import type { DocumentPage } from '../../shared/types/documents'

export interface DocumentChunkDraft {
  text: string
  pageStart: number
  pageEnd: number
  heading: string | null
  tokenCount: number
}

/**
 * ~4 characters/token is a common rough approximation for English text.
 * Good enough to size chunks in the 500–1200 token range per AI_RAG.md §4 —
 * this is not meant to match any specific model's real tokenizer count.
 */
const CHARS_PER_TOKEN = 4
const DEFAULT_TARGET_TOKENS = 800
const DEFAULT_OVERLAP_TOKENS = 100

interface PageSpan {
  pageNumber: number
  heading: string | null
  start: number
  end: number
}

/**
 * Sliding-window chunker over a document's pages. Chunks may span multiple
 * pages (AI_RAG.md §4 forbids mixing pages *without* metadata, not mixing
 * pages at all) — each chunk carries the page range and nearest preceding
 * heading it was drawn from, which is what "never mix without metadata"
 * actually requires.
 */
export function chunkPages(
  pages: DocumentPage[],
  targetTokens = DEFAULT_TARGET_TOKENS,
  overlapTokens = DEFAULT_OVERLAP_TOKENS
): DocumentChunkDraft[] {
  const targetChars = targetTokens * CHARS_PER_TOKEN
  const overlapChars = overlapTokens * CHARS_PER_TOKEN
  if (overlapChars >= targetChars) {
    throw new Error('chunkPages: overlapTokens must be smaller than targetTokens')
  }

  let joined = ''
  const spans: PageSpan[] = []
  let currentHeading: string | null = null

  for (const page of pages) {
    if (page.heading) currentHeading = page.heading
    const start = joined.length
    joined += (joined ? '\n\n' : '') + page.text
    spans.push({ pageNumber: page.pageNumber, heading: currentHeading, start, end: joined.length })
  }

  if (joined.trim().length === 0 || spans.length === 0) return []

  const chunks: DocumentChunkDraft[] = []
  let cursor = 0

  while (cursor < joined.length) {
    const end = Math.min(cursor + targetChars, joined.length)
    const text = joined.slice(cursor, end).trim()

    if (text.length > 0) {
      const spanned = spans.filter((s) => s.end > cursor && s.start < end)
      const first = spanned[0] ?? spans[0]
      const last = spanned.at(-1) ?? spans.at(-1)!
      chunks.push({
        text,
        pageStart: first.pageNumber,
        pageEnd: last.pageNumber,
        heading: first.heading,
        tokenCount: Math.ceil(text.length / CHARS_PER_TOKEN)
      })
    }

    if (end >= joined.length) break
    cursor = end - overlapChars
  }

  return chunks
}
