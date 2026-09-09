import { useEffect, useState } from 'react'
import { Button, Card, LoadingState } from '../../../design-system'
import type { AIUsageSummary, UsageRange } from '@shared/types/diagnostics'

const RANGES: { value: UsageRange; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: 'all', label: 'Todo' }
]

function formatCost(cost: number | null): string {
  return cost === null ? 'No disponible' : `$${cost.toFixed(4)}`
}

export function AIUsageTab(): React.JSX.Element {
  const [range, setRange] = useState<UsageRange>('7d')
  const [summary, setSummary] = useState<AIUsageSummary | null>(null)

  useEffect(() => {
    window.studyos.diagnostics.getUsageSummary(range).then(setSummary)
  }, [range])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.value}
            size="sm"
            variant={range === r.value ? 'primary' : 'ghost'}
            onClick={() => setRange(r.value)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {!summary || summary.range !== range ? (
        <LoadingState label="Calculando uso..." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <p className="text-xs text-text-secondary">Solicitudes</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">{summary.requests}</p>
              <p className="text-xs text-text-muted">
                {summary.successful} ok · {summary.failed} con error
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-secondary">Tokens</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {summary.inputTokens + summary.outputTokens}
              </p>
              <p className="text-xs text-text-muted">
                {summary.inputTokens} entrada · {summary.outputTokens} salida
              </p>
            </Card>
            <Card>
              <p className="text-xs text-text-secondary">Costo estimado</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {formatCost(summary.estimatedCost)}
              </p>
              {summary.costUnavailableCount > 0 && (
                <p className="text-xs text-text-muted">
                  {summary.costUnavailableCount} registro(s) sin tarifa conocida
                </p>
              )}
            </Card>
            <Card>
              <p className="text-xs text-text-secondary">Latencia promedio</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {summary.averageLatencyMs ? `${summary.averageLatencyMs} ms` : '—'}
              </p>
              <p className="text-xs text-text-muted">
                Primer token:{' '}
                {summary.averageFirstTokenMs ? `${summary.averageFirstTokenMs} ms` : '—'}
              </p>
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-text-primary">Por función</h3>
            {summary.byFeature.length === 0 ? (
              <p className="mt-2 text-xs text-text-secondary">Sin actividad en este rango.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-text-muted">
                    <tr>
                      <th className="py-1 pr-4">Función</th>
                      <th className="py-1 pr-4">Solicitudes</th>
                      <th className="py-1 pr-4">Tokens entrada</th>
                      <th className="py-1 pr-4">Tokens salida</th>
                      <th className="py-1">Costo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byFeature.map((row) => (
                      <tr key={row.feature} className="border-t border-border text-text-secondary">
                        <td className="py-1.5 pr-4 text-text-primary">{row.feature}</td>
                        <td className="py-1.5 pr-4">{row.requests}</td>
                        <td className="py-1.5 pr-4">{row.inputTokens}</td>
                        <td className="py-1.5 pr-4">{row.outputTokens}</td>
                        <td className="py-1.5">{formatCost(row.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
