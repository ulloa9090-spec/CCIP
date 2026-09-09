import { useState } from 'react'
import { Button, Card, EmptyState, LoadingState } from '../../../design-system'
import { parseSerializedAppError } from '@shared/types/errors'
import type { RetrievalInspectionResult } from '@shared/types/diagnostics'

export function RetrievalInspectorTab(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<RetrievalInspectionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(): Promise<void> {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      setResult(await window.studyos.diagnostics.inspectRetrieval({ query }))
    } catch (err) {
      setError(parseSerializedAppError(err).userMessage)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-xs text-text-secondary">
          Ejecuta la misma búsqueda por similitud que usa el Tutor, sin llamar al proveedor de IA —
          para ver exactamente qué fragmentos (y con qué puntaje) recuperaría una pregunta dada.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void runSearch()
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Escribe una consulta de prueba..."
            aria-label="Consulta de prueba"
            className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-text-primary"
          />
          <Button type="submit" size="sm" disabled={loading || !query.trim()}>
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </form>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </Card>

      {loading && <LoadingState label="Recuperando fragmentos..." />}

      {!loading && result && result.results.length === 0 && (
        <EmptyState
          title="Sin resultados"
          description="Ningún fragmento de la biblioteca coincide con esta consulta."
        />
      )}

      {!loading && result && result.results.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            {result.results.length} fragmento(s) · {result.durationMs} ms · mejor puntaje{' '}
            {result.bestScore?.toFixed(4)}
          </p>
          {result.results.map((chunk, index) => (
            <Card key={chunk.chunkId}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-text-primary">
                  #{index + 1} · {chunk.documentTitle} · p.{' '}
                  {chunk.pageStart === chunk.pageEnd
                    ? chunk.pageStart
                    : `${chunk.pageStart}–${chunk.pageEnd}`}
                </p>
                <p className="text-xs font-mono text-text-muted">{chunk.score.toFixed(4)}</p>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{chunk.text}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
