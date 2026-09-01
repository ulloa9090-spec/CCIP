import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Card, LoadingState, StatusBadge } from '../../design-system'
import type { StatusTone } from '../../design-system'
import type { DocumentDetail, DocumentProgressEvent, DocumentStatus } from '@shared/types/documents'
import { PdfViewer } from './PdfViewer'

const STATUS_LABEL: Record<DocumentStatus, string> = {
  imported: 'Importado',
  extracting: 'Extrayendo...',
  ready: 'Listo',
  failed: 'Error'
}

const STATUS_TONE: Record<DocumentStatus, StatusTone> = {
  imported: 'muted',
  extracting: 'warning',
  ready: 'success',
  failed: 'danger'
}

export function DocumentDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const initialPage = Number(searchParams.get('page')) || 1
  const navigate = useNavigate()
  const [document, setDocument] = useState<DocumentDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  const refresh = useCallback(() => {
    if (!id) return
    window.studyos.documents.get(id).then(setDocument, () => setNotFound(true))
  }, [id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    return window.studyos.documents.onProgress((event: DocumentProgressEvent) => {
      if (event.documentId === id && (event.stage === 'ready' || event.stage === 'failed')) {
        refresh()
      }
    })
  }, [id, refresh])

  async function handleDelete(): Promise<void> {
    if (!id) return
    if (
      !window.confirm(
        '¿Eliminar este documento de tu biblioteca? Esta acción no se puede deshacer.'
      )
    ) {
      return
    }
    await window.studyos.documents.delete(id)
    navigate('/library')
  }

  async function handleReindex(): Promise<void> {
    if (!id) return
    await window.studyos.documents.reindex(id)
    refresh()
  }

  if (notFound) {
    return <p className="text-sm text-danger">Documento no encontrado.</p>
  }

  if (!document) {
    return <LoadingState label="Cargando documento..." />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-text-primary">{document.title}</h1>
          <p className="text-xs text-text-muted">
            {document.pageCount ? `${document.pageCount} páginas` : document.originalFilename} ·{' '}
            {document.originalFilename}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge tone={STATUS_TONE[document.status]}>
            {STATUS_LABEL[document.status]}
          </StatusBadge>
          {document.status === 'ready' && !document.indexed && (
            <StatusBadge tone="muted">Sin indexar</StatusBadge>
          )}
          {document.status === 'ready' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate(`/courses/new?documentId=${document.id}`)}
            >
              Crear curso
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleReindex}>
            Reindexar
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDelete}>
            Eliminar
          </Button>
        </div>
      </div>

      {document.status === 'ready' && !document.indexed && (
        <p className="text-xs text-text-muted">
          Este documento aún no está indexado para búsqueda semántica — puedes seguir leyéndolo
          normalmente. Usa &quot;Reindexar&quot; para intentarlo de nuevo (necesita conexión a
          internet la primera vez).
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          {document.status === 'ready' ? (
            <PdfViewer key={document.id} documentId={document.id} initialPage={initialPage} />
          ) : (
            <p className="p-6 text-center text-sm text-text-secondary">
              {document.status === 'failed'
                ? 'El procesamiento falló. Usa "Reindexar" para intentarlo de nuevo.'
                : 'El documento se está procesando. El visor estará disponible cuando termine.'}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-text-primary">Contenido</h2>
          {document.outline.length === 0 ? (
            <p className="mt-2 text-xs text-text-muted">No se detectaron marcadores en este PDF.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">
              {document.outline.map((item) => (
                <li key={`${item.pageNumber}-${item.title}`} className="flex justify-between gap-2">
                  <span className="truncate">{item.title}</span>
                  <span className="shrink-0 text-text-muted">p. {item.pageNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
