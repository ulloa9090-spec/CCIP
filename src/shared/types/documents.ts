/**
 * Persisted document lifecycle — gates whether a document is *viewable* in
 * the Biblioteca. Deliberately does NOT include `chunking`/`embedding`:
 * those are indexing sub-stages (see ProcessingStage below) that must never
 * make an already-extracted, viewable document unusable just because
 * indexing failed (e.g. no network for the embedding model's first
 * download) — MASTER_SPEC.md §16, "debe seguir funcionando parcialmente sin
 * conexión". See DECISIONS.md ADR-008, ADR-013.
 */
export type DocumentStatus = 'imported' | 'extracting' | 'ready' | 'failed'

/**
 * Transient progress reporting only — never persisted to `documents.status`.
 * `chunking`/`embedding` cover Fase 3's indexing sub-stages, which run
 * automatically after a document reaches `ready` and are best-effort.
 */
export type ProcessingStage = DocumentStatus | 'chunking' | 'embedding'

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
  /** Whether the document has a usable retrieval index (Fase 3). */
  indexed: boolean
}

export interface DocumentProgressEvent {
  documentId: string
  stage: ProcessingStage
  /** 0-100. */
  progress: number
  errorMessage?: string
}
