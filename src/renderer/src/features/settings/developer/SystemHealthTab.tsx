import { useEffect, useState } from 'react'
import { Button, Card, LoadingState, StatusBadge } from '../../../design-system'
import type { HealthCheck, HealthStatus, SystemHealth } from '@shared/types/diagnostics'
import type { StatusTone } from '../../../design-system'

const TONE_BY_STATUS: Record<HealthStatus, StatusTone> = {
  healthy: 'success',
  warning: 'warning',
  error: 'danger',
  unknown: 'muted'
}

const LABEL_BY_STATUS: Record<HealthStatus, string> = {
  healthy: 'OK',
  warning: 'Atención',
  error: 'Error',
  unknown: 'Sin verificar'
}

function CheckRow({ check, extra }: { check: HealthCheck; extra?: string }): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <div>
        <p className="text-sm text-text-primary">{check.label}</p>
        {check.detail && <p className="mt-0.5 text-xs text-text-secondary">{check.detail}</p>}
        {extra && <p className="mt-0.5 text-xs text-text-muted">{extra}</p>}
      </div>
      <StatusBadge tone={TONE_BY_STATUS[check.status]}>{LABEL_BY_STATUS[check.status]}</StatusBadge>
    </div>
  )
}

export function SystemHealthTab(): React.JSX.Element {
  const [health, setHealth] = useState<SystemHealth | null>(null)

  function load(): void {
    window.studyos.diagnostics.getSystemHealth().then(setHealth)
  }

  useEffect(load, [])

  if (!health) return <LoadingState label="Verificando estado del sistema..." />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={load}>
          Actualizar
        </Button>
      </div>
      <Card>
        <CheckRow
          check={health.sqlite}
          extra={`Versión de esquema: ${health.sqlite.databaseVersion}`}
        />
        <CheckRow check={health.documentEngine} />
        <CheckRow
          check={health.embeddingEngine}
          extra={
            health.embeddingEngine.dimensions
              ? `${health.embeddingEngine.model} · ${health.embeddingEngine.dimensions} dimensiones`
              : health.embeddingEngine.model
          }
        />
        <CheckRow
          check={health.openAI}
          extra={
            health.openAI.lastConnectionAt
              ? `Último intento: ${new Date(health.openAI.lastConnectionAt).toLocaleString('es')}`
              : undefined
          }
        />
        <CheckRow
          check={health.retrieval}
          extra={`${health.retrieval.chunksIndexed} fragmentos indexados`}
        />
        <CheckRow
          check={health.processingQueue}
          extra={`${health.processingQueue.pendingJobs} trabajo(s) activos`}
        />
        <CheckRow
          check={health.lastBackup}
          extra={
            health.lastBackup.backedUpAt
              ? new Date(health.lastBackup.backedUpAt).toLocaleString('es')
              : undefined
          }
        />
      </Card>
    </div>
  )
}
