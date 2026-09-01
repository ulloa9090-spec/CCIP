import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  ProgressBar,
  StatusBadge
} from '../../design-system'
import type { StatusTone } from '../../design-system'
import type {
  DocumentProgressEvent,
  DocumentStatus,
  LibraryDocument,
  ProcessingStage
} from '@shared/types/documents'
import { parseSerializedAppError } from '@shared/types/errors'

const STAGE_LABEL: Record<ProcessingStage, string> = {
  imported: 'Importado',
  extracting: 'Extrayendo...',
  chunking: 'Dividiendo texto...',
  embedding: 'Indexando...',
  ready: 'Listo',
  failed: 'Error'
}

const STAGE_TONE: Record<ProcessingStage, StatusTone> = {
  imported: 'muted',
  extracting: 'warning',
  chunking: 'warning',
  embedding: 'warning',
  ready: 'success',
  failed: 'danger'
}

const ACTIVE_STAGES: ProcessingStage[] = ['extracting', 'chunking', 'embedding']

export function LibraryPage(): React.JSX.Element {
  const [documents, setDocuments] = useState<LibraryDocument[] | null>(null)
  const [progressByDocument, setProgressByDocument] = useState<Record<string, number>>({})
  const [stageByDocument, setStageByDocument] = useState<Record<string, ProcessingStage>>({})
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    window.studyos.documents.list().then(setDocuments)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    return window.studyos.documents.onProgress((event: DocumentProgressEvent) => {
      setProgressByDocument((prev) => ({ ...prev, [event.documentId]: event.progress }))
      setStageByDocument((prev) => ({ ...prev, [event.documentId]: event.stage }))
      if (event.stage === 'ready' || event.stage === 'failed') {
        const finalStatus: DocumentStatus = event.stage
        setDocuments(
          (prev) =>
            prev?.map((doc) =>
              doc.id === event.documentId ? { ...doc, status: finalStatus } : doc
            ) ?? prev
        )
      }
    })
  }, [])

  async function handleImport(): Promise<void> {
    setImporting(true)
    setError(null)
    try {
      const imported = await window.studyos.documents.import()
      if (imported.length > 0) refresh()
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
    } finally {
      setImporting(false)
    }
  }

  async function handleDelete(id: string): Promise<void> {
    if (
      !window.confirm(
        '¿Eliminar este documento de tu biblioteca? Esta acción no se puede deshacer.'
      )
    ) {
      return
    }
    await window.studyos.documents.delete(id)
    refresh()
  }

  async function handleReindex(id: string): Promise<void> {
    await window.studyos.documents.reindex(id)
    refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Mi Biblioteca</h1>
          <p className="text-sm text-text-secondary">Importa PDFs para empezar a estudiarlos.</p>
        </div>
        <Button onClick={handleImport} disabled={importing}>
          {importing ? 'Importando...' : '+ Agregar documento'}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {documents === null && <LoadingState label="Cargando biblioteca..." />}

      {documents !== null && documents.length === 0 && (
        <EmptyState
          title="Tu biblioteca está vacía"
          description="Agrega un PDF para que StudyOS lo procese y puedas estudiarlo."
          action={
            <Button size="sm" onClick={handleImport} disabled={importing}>
              + Agregar documento
            </Button>
          }
        />
      )}

      {documents !== null && documents.length > 0 && (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const stage: ProcessingStage = stageByDocument[doc.id] ?? doc.status
            return (
              <Card key={doc.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Link to={`/library/${doc.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary hover:underline">
                      {doc.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {doc.pageCount ? `${doc.pageCount} páginas` : doc.originalFilename}
                    </p>
                  </Link>
                  <StatusBadge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</StatusBadge>
                  {doc.status === 'failed' && (
                    <Button size="sm" variant="ghost" onClick={() => handleReindex(doc.id)}>
                      Reintentar
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(doc.id)}>
                    Eliminar
                  </Button>
                </div>
                {ACTIVE_STAGES.includes(stage) && (
                  <ProgressBar value={progressByDocument[doc.id] ?? 0} tone="warning" />
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
