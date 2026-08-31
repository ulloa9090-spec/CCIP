/**
 * `chunking`/`embedding` are legitimate values of DATA_MODEL.md §3's status
 * enum but belong to Fase 3 (Retrieval) — Fase 2 only ever writes these
 * four. See DECISIONS.md ADR-008.
 */
export type DocumentStatus = 'imported' | 'extracting' | 'ready' | 'failed'

export interface LibraryDocument {
  id: string
  title: string
  originalFilename: string
  mimeType: string
  pageCount: number | null
  status: DocumentStatus
  createdAt: string
  updatedAt: string
}

export interface DocumentOutlineItem {
  title: string
  /** 1-based, matching DocumentPage.pageNumber. */
  pageNumber: number
}

export interface DocumentPage {
  pageNumber: number
  text: string
  heading: string | null
}

export interface DocumentDetail extends LibraryDocument {
  pages: DocumentPage[]
  outline: DocumentOutlineItem[]
}

export interface DocumentProgressEvent {
  documentId: string
  status: DocumentStatus
  /** 0-100. */
  progress: number
  errorMessage?: string
}
