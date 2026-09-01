import { createHash } from 'crypto'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { paths } from './paths'

interface DocumentMetadataFile {
  title: string
  originalFilename: string
  mimeType: string
  fileHash: string
}

/**
 * Layout per ARCHITECTURE.md §9: `documents/{documentId}/{original.pdf,metadata.json}`.
 * `extracted.json` from that layout is deferred — Fase 2's only durable
 * artifact besides the DB is `original.pdf`; "Reindexar" re-runs extraction
 * from it rather than resuming from a cache. See DECISIONS.md ADR-008.
 */
function documentDir(documentId: string): string {
  return join(paths.documents(), documentId)
}

export function originalPdfPath(documentId: string): string {
  return join(documentDir(documentId), 'original.pdf')
}

function metadataPath(documentId: string): string {
  return join(documentDir(documentId), 'metadata.json')
}

export function hashFile(sourcePath: string): string {
  return createHash('sha256').update(readFileSync(sourcePath)).digest('hex')
}

export function importPdfIntoStorage(
  documentId: string,
  sourcePath: string,
  metadata: DocumentMetadataFile
): void {
  mkdirSync(documentDir(documentId), { recursive: true })
  copyFileSync(sourcePath, originalPdfPath(documentId))
  writeFileSync(metadataPath(documentId), JSON.stringify(metadata, null, 2))
}

export function readOriginalPdf(documentId: string): Buffer {
  return readFileSync(originalPdfPath(documentId))
}

export function deleteDocumentStorage(documentId: string): void {
  rmSync(documentDir(documentId), { recursive: true, force: true })
}
