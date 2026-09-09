import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../../design-system'
import { SystemHealthTab } from './SystemHealthTab'
import { AIUsageTab } from './AIUsageTab'
import { RetrievalInspectorTab } from './RetrievalInspectorTab'
import { RequestHistoryTab } from './RequestHistoryTab'
import { DocumentHealthTab } from './DocumentHealthTab'
import type { DiagnosticsSettings } from '@shared/types/diagnostics'

type Tab = 'health' | 'usage' | 'inspector' | 'requests' | 'documents'

const TABS: { id: Tab; label: string }[] = [
  { id: 'health', label: 'Estado del sistema' },
  { id: 'usage', label: 'Uso de IA' },
  { id: 'inspector', label: 'Inspector de recuperación' },
  { id: 'requests', label: 'Historial de solicitudes' },
  { id: 'documents', label: 'Salud de documentos' }
]

/**
 * Fase 13's "Developer Diagnostics" home — nested under Settings, per the
 * spec, so it never competes with the primary study-focused navigation.
 * Every tab is a thin read view over the IPC handlers `diagnosticsIpc.ts`
 * exposes; no diagnostics business logic lives in this file.
 */
export function DeveloperDiagnosticsPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab | null) ?? 'health'
  const requestId = searchParams.get('requestId')

  const [settings, setSettings] = useState<DiagnosticsSettings | null>(null)

  useEffect(() => {
    window.studyos.diagnostics.getSettings().then(setSettings)
  }, [])

  function selectTab(next: Tab): void {
    setSearchParams({ tab: next })
  }

  async function toggleStoreDetails(): Promise<void> {
    if (!settings) return
    setSettings(
      await window.studyos.diagnostics.setSettings({ storeDetails: !settings.storeDetails })
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Diagnóstico de Desarrollador</h1>
          <p className="text-sm text-text-secondary">
            Observabilidad local del pipeline documento → respuesta. Nada de esto sale de tu equipo.
          </p>
        </div>
        <Link to="/settings" className="text-xs text-primary hover:underline">
          ← Volver a Configuración
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Guardar detalle de solicitudes</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Cuando está desactivado, las métricas agregadas (tokens, costo, latencia) se siguen
              registrando; solo se deja de guardar el texto de tus preguntas.
            </p>
          </div>
          <Button
            size="sm"
            variant={settings?.storeDetails ? 'primary' : 'ghost'}
            onClick={toggleStoreDetails}
            disabled={!settings}
          >
            {settings?.storeDetails ? 'Activado' : 'Desactivado'}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              tab === t.id
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:bg-surface-elevated'
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'health' && <SystemHealthTab />}
      {tab === 'usage' && <AIUsageTab />}
      {tab === 'inspector' && <RetrievalInspectorTab />}
      {tab === 'requests' && <RequestHistoryTab initialRequestId={requestId} />}
      {tab === 'documents' && <DocumentHealthTab />}
    </div>
  )
}
