import { useEffect, useState } from 'react'
import { Card, EmptyState, LoadingState, StatusBadge } from '../../../design-system'
import type { StatusTone } from '../../../design-system'
import { ABSTENTION_REASON_LABELS } from './abstentionReasons'
import type {
  DiagnosticRequestDetail,
  DiagnosticRequestStatus,
  DiagnosticRequestSummary
} from '@shared/types/diagnostics'

const STATUS_TONE: Record<DiagnosticRequestStatus, StatusTone> = {
  success: 'success',
  error: 'danger',
  aborted: 'warning',
  in_progress: 'muted'
}

interface RequestHistoryTabProps {
  /** Pre-selects a trace when arriving from the Tutor's "¿Por qué?" link. */
  initialRequestId?: string | null
}

export function RequestHistoryTab({
  initialRequestId = null
}: RequestHistoryTabProps): React.JSX.Element {
  const [requests, setRequests] = useState<DiagnosticRequestSummary[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialRequestId)
  const [detail, setDetail] = useState<DiagnosticRequestDetail | null>(null)

  useEffect(() => {
    window.studyos.diagnostics.listRequests().then(setRequests)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    window.studyos.diagnostics.getRequestDetail(selectedId).then(setDetail)
  }, [selectedId])

  // Avoids flashing the previous selection's trace while the new one loads.
  const detailMatchesSelection = detail !== null && detail.id === selectedId

  if (!requests) return <LoadingState label="Cargando historial de solicitudes..." />

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Aún no hay solicitudes registradas"
        description="Cada pregunta que le hagas al Tutor queda registrada aquí, con su cadena completa de eventos."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto">
        {requests.map((request) => (
          <button
            key={request.id}
            type="button"
            onClick={() => setSelectedId(request.id)}
            className={[
              'rounded-lg border p-3 text-left text-xs transition-colors',
              selectedId === request.id
                ? 'border-primary bg-primary/10'
                : 'border-border bg-surface hover:bg-surface-elevated'
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">{request.feature}</span>
              <StatusBadge tone={STATUS_TONE[request.status]}>{request.status}</StatusBadge>
            </div>
            <p className="mt-1 truncate text-text-secondary">
              {request.question ?? '(pregunta no almacenada)'}
            </p>
            <p className="mt-1 text-text-muted">
              {new Date(request.startedAt).toLocaleString('es')}
              {request.durationMs !== null && ` · ${request.durationMs} ms`}
              {request.abstentionReason && ` · ${request.abstentionReason}`}
            </p>
          </button>
        ))}
      </div>

      <div>
        {!selectedId && (
          <EmptyState
            title="Selecciona una solicitud"
            description="Elige una entrada de la izquierda para ver su cronología completa."
          />
        )}
        {selectedId && !detailMatchesSelection && <LoadingState label="Cargando cronología..." />}
        {selectedId && detailMatchesSelection && detail && (
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">{detail.feature}</h3>
              <StatusBadge tone={STATUS_TONE[detail.status]}>{detail.status}</StatusBadge>
            </div>
            {detail.question && (
              <p className="mt-1 text-xs text-text-secondary">“{detail.question}”</p>
            )}
            {detail.abstentionReason && (
              <p className="mt-2 rounded-md bg-warning/10 p-2 text-xs text-text-primary">
                {ABSTENTION_REASON_LABELS[detail.abstentionReason]?.technical ??
                  detail.abstentionReason}
              </p>
            )}
            {detail.bestSimilarityScore !== null && (
              <p className="mt-2 text-xs text-text-muted">
                Mejor puntaje de similitud: {detail.bestSimilarityScore.toFixed(4)}
              </p>
            )}

            <h4 className="mt-4 text-xs font-semibold text-text-primary">Cronología</h4>
            <ol className="mt-2 flex flex-col gap-1.5 border-l border-border pl-3">
              {detail.events.map((event) => (
                <li key={event.id} className="text-xs">
                  <span className="font-mono text-text-muted">+{event.offsetMs}ms</span>{' '}
                  <span className="text-text-primary">{event.eventType}</span>
                  {event.durationMs !== null && (
                    <span className="text-text-muted"> ({event.durationMs}ms)</span>
                  )}
                  {event.metadata && (
                    <span className="ml-1 text-text-secondary">
                      {Object.entries(event.metadata)
                        .map(([key, value]) => `${key}=${String(value)}`)
                        .join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ol>

            {detail.usage.length > 0 && (
              <>
                <h4 className="mt-4 text-xs font-semibold text-text-primary">Uso de IA</h4>
                <div className="mt-2 flex flex-col gap-1">
                  {detail.usage.map((usage) => (
                    <p key={usage.id} className="text-xs text-text-secondary">
                      {usage.provider}/{usage.model} · {usage.status} · {usage.totalTokens ?? '—'}{' '}
                      tokens · {usage.latencyMs ?? '—'} ms
                      {usage.errorCode && ` · ${usage.errorCode}`}
                    </p>
                  ))}
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
