import { basename, extname } from 'path'
import { existsSync, statSync } from 'fs'
import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { Database } from 'better-sqlite3'
import { DocumentRepository } from '../database/repositories/documentRepository'
import { DocumentProcessingQueue } from '../jobs/documentProcessingQueue'
import {
  deleteDocumentStorage,
  hashFile,
  importPdfIntoStorage,
  readOriginalPdf
} from '../filesystem/documentStorage'
import { AppError } from '../../shared/types/errors'
import { logger } from '../logging/logger'
import type {
  DocumentDetail,
  DocumentProgressEvent,
  LibraryDocument
} from '../../shared/types/documents'

const MAX_PDF_SIZE_BYTES = 300 * 1024 * 1024

function handle(
  channel: string,
  fn: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    try {
      return await fn(event, ...args)
    } catch (error) {
      const appError =
        error instanceof AppError
          ? error
          : new AppError({
              code: 'INTERNAL',
              userMessage: 'Ocurrió un error inesperado.',
              cause: error
            })
      logger.error(`IPC ${channel} failed`, { code: appError.code })
      throw new Error(JSON.stringify(appError.toJSON()))
    }
  })
}

function assertDocumentId(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError({ code: 'INVALID_ARGUMENT', userMessage: 'Documento inválido.' })
  }
  return value
}

function importOneFile(
  documents: DocumentRepository,
  queue: DocumentProcessingQueue,
  filePath: string
): LibraryDocument {
  if (!existsSync(filePath) || extname(filePath).toLowerCase() !== '.pdf') {
    throw new AppError({
      code: 'INVALID_FILE',
      userMessage: `"${basename(filePath)}" no es un PDF válido.`
    })
  }

  const size = statSync(filePath).size
  if (size > MAX_PDF_SIZE_BYTES) {
    throw new AppError({
      code: 'FILE_TOO_LARGE',
      userMessage: `"${basename(filePath)}" supera el tamaño máximo soportado (300 MB).`
    })
  }

  const fileHash = hashFile(filePath)
  const existing = documents.findByHash(fileHash)
  if (existing) return existing

  const title = basename(filePath, extname(filePath))
  const document = documents.create({
    title,
    originalFilename: basename(filePath),
    mimeType: 'application/pdf',
    fileHash
  })

  importPdfIntoStorage(document.id, filePath, {
    title,
    originalFilename: basename(filePath),
    mimeType: 'application/pdf',
    fileHash
  })

  queue.enqueueExtraction(document.id)
  return document
}

export function registerDocumentsIpc(db: Database): DocumentProcessingQueue {
  const documents = new DocumentRepository(db)
  const queue = new DocumentProcessingQueue(db)

  queue.onProgress((event: DocumentProgressEvent) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('documents:progress', event)
    }
  })

  handle('documents:import', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const result = await dialog.showOpenDialog(window as BrowserWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (result.canceled) return []
    return result.filePaths.map((filePath) => importOneFile(documents, queue, filePath))
  })

  handle('documents:list', () => documents.list())

  handle('documents:get', (_event, id): DocumentDetail => {
    const documentId = assertDocumentId(id)
    const document = documents.getById(documentId)
    if (!document) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Documento no encontrado.' })
    }
    return {
      ...document,
      pages: documents.getPages(documentId),
      outline: documents.getOutline(documentId)
    }
  })

  handle('documents:delete', (_event, id) => {
    const documentId = assertDocumentId(id)
    documents.delete(documentId)
    deleteDocumentStorage(documentId)
  })

  handle('documents:reindex', (_event, id) => {
    const documentId = assertDocumentId(id)
    const document = documents.getById(documentId)
    if (!document) {
      throw new AppError({ code: 'NOT_FOUND', userMessage: 'Documento no encontrado.' })
    }
    queue.enqueueExtraction(documentId)
  })

  handle('documents:getFileBuffer', (_event, id) => {
    const documentId = assertDocumentId(id)
    return readOriginalPdf(documentId)
  })

  return queue
}
