import type {
  DocumentOutlineItem,
  DocumentPage,
  LibraryDocument
} from '../../shared/types/documents'

/**
 * Total character budget across all selected documents' sampled page text,
 * on top of their outlines. Keeps the generation prompt's cost and latency
 * bounded regardless of how large or how many PDFs the user selects — a
 * multi-hundred-page manual must not blow up the request the way sending
 * its full extracted text would.
 */
const CHAR_BUDGET = 30_000

export interface DocumentSource {
  document: LibraryDocument
  outline: DocumentOutlineItem[]
  pages: DocumentPage[]
}

function sampleObjects<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items
  const step = items.length / count
  const sampled: T[] = []
  for (let i = 0; i < count; i++) {
    sampled.push(items[Math.floor(i * step)])
  }
  return sampled
}

/**
 * Builds the text handed to the AI provider for course generation: each
 * document's outline (if any) plus an evenly-spaced subset of its page
 * text, capped by CHAR_BUDGET split evenly across the selected documents.
 * Even sampling (rather than just the first N pages) matters because a
 * document's later chapters are just as relevant to a course as its first
 * ones.
 */
export function buildSourceMaterial(sources: DocumentSource[]): string {
  if (sources.length === 0) return ''
  const perDocumentBudget = Math.floor(CHAR_BUDGET / sources.length)

  return sources
    .map(({ document, outline, pages }) => {
      const outlineText =
        outline.length > 0
          ? `Índice:\n${outline.map((item) => `- ${item.title} (p. ${item.pageNumber})`).join('\n')}\n\n`
          : ''

      const pageBudget = Math.max(perDocumentBudget - outlineText.length, 0)
      const perPageBudget =
        pages.length > 0 ? Math.floor(pageBudget / Math.min(pages.length, 20)) : 0
      const sampledPages = sampleObjects(pages, 20)
      const pagesText = sampledPages
        .map((page) => `[p. ${page.pageNumber}] ${page.text.slice(0, perPageBudget)}`)
        .join('\n\n')

      return `=== Documento: ${document.title} ===\n${outlineText}${pagesText}`
    })
    .join('\n\n')
}
