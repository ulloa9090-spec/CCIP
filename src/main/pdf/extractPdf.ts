import { join } from 'path'
import { pathToFileURL } from 'url'
import { readFileSync } from 'fs'
// pdfjs-dist ships the legacy (no-DOM) build as native ESM (.mjs); Node 22's
// synchronous `require(esm)` support (bundled into Electron's main process,
// which electron-vite compiles to CJS) loads it directly — verified against
// the actual built main bundle, not just typechecked.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { DocumentOutlineItem, DocumentPage } from '../../shared/types/documents'

const PDFJS_ROOT = join(require.resolve('pdfjs-dist/package.json'), '..')
const STANDARD_FONT_DATA_URL = pathToFileURL(join(PDFJS_ROOT, 'standard_fonts') + '/').href
const CMAP_URL = pathToFileURL(join(PDFJS_ROOT, 'cmaps') + '/').href

export interface ExtractedPdf {
  pageCount: number
  pages: DocumentPage[]
  outline: DocumentOutlineItem[]
}

function normalizeText(raw: string): string {
  return raw
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Best-effort outline detection using the PDF's own embedded bookmarks
 * (pdf.js `getOutline()`). No font-size/layout heuristic is attempted —
 * plenty of manuals ship real bookmarks, and a heuristic good enough to beat
 * "no outline" is a non-trivial project on its own. See DECISIONS.md
 * ADR-008. A document with no bookmarks simply has an empty outline.
 */
async function extractOutline(
  pdf: Awaited<ReturnType<typeof getDocument>['promise']>
): Promise<DocumentOutlineItem[]> {
  const rawOutline = await pdf.getOutline().catch(() => null)
  if (!rawOutline) return []

  const items: DocumentOutlineItem[] = []
  for (const entry of rawOutline) {
    try {
      let dest = entry.dest
      if (typeof dest === 'string') {
        dest = await pdf.getDestination(dest)
      }
      if (!Array.isArray(dest) || dest.length === 0) continue
      const pageIndex = await pdf.getPageIndex(dest[0])
      items.push({ title: entry.title, pageNumber: pageIndex + 1 })
    } catch {
      // Unresolvable bookmark target — skip it, don't fail the whole import.
    }
  }
  return items
}

export async function extractPdf(
  filePath: string,
  onPageExtracted?: (pageNumber: number, totalPages: number) => void
): Promise<ExtractedPdf> {
  // Read bytes ourselves and hand them over as `data` rather than `url`:
  // pdf.js's own file:// fetching (`url`) works under Electron's Node but
  // mis-parses the response under plain Node (confirmed empirically — this
  // is what Vitest runs on), so `data` is the only path verified to work in
  // both. See DECISIONS.md ADR-010.
  const loadingTask = getDocument({
    data: new Uint8Array(readFileSync(filePath)),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    useWorkerFetch: false
  })
  const pdf = await loadingTask.promise

  try {
    const pages: DocumentPage[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const text = normalizeText(
        content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
      )
      pages.push({ pageNumber, text, heading: null })
      page.cleanup()
      onPageExtracted?.(pageNumber, pdf.numPages)
    }

    const outline = await extractOutline(pdf)
    for (const item of outline) {
      const page = pages.find((p) => p.pageNumber === item.pageNumber)
      if (page && !page.heading) page.heading = item.title
    }

    return { pageCount: pdf.numPages, pages, outline }
  } finally {
    await loadingTask.destroy()
  }
}
