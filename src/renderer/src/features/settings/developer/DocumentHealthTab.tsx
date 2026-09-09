import { useEffect, useState } from 'react'
import { Card, EmptyState, LoadingState, StatusBadge } from '../../../design-system'
import type { StatusTone } from '../../../design-system'
import type { DocumentHealth } from '@shared/types/diagnostics'

const STATUS_TONE: Record<DocumentHealth['processingStatus'], StatusTone> = {
  complete: 'success',
  partial: 'warning',
  failed: 'danger',
  processing: 'muted'
}

export function DocumentHealthTab(): React.JSX.Element {
  const [documents, setDocuments] = useState<DocumentHealth[] | null>(null)

  useEffect(() => {
    window.studyos.diagnostics.listDocumentHealth().then(setDocuments)
  }, [])

  if (!documents) return <LoadingState label="Revisando el estado de los documentos..." />

  if (documents.length === 0) {
    return (
      <EmptyState
        title="Sin documentos"
        description="Importa un documento en Biblioteca para ver su estado de procesamiento aquí."
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((doc) => (
        <Card key={doc.documentId}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">{doc.documentTitle}</p>
            <StatusBadge tone={STATUS_TONE[doc.processingStatus]}>
              {doc.processingStatus}
            </StatusBadge>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {doc.pages} páginas · extracción de texto: {doc.textExtraction} · {doc.chunks}{' '}
            fragmentos indexados
            {doc.processingDurationMs !== null && ` · ${doc.processingDurationMs} ms de proceso`}
          </p>
          {doc.lastError && (
            <p className="mt-2 rounded-md bg-danger/10 p-2 text-xs text-danger">
              [{doc.lastError.stage}] {doc.lastError.code}: {doc.lastError.message}
            </p>
          )}
        </Card>
      ))}
    </div>
  )
}
