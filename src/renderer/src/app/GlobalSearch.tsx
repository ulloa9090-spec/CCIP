import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RetrievalResult } from '@shared/types/retrieval'
import { parseSerializedAppError } from '@shared/types/errors'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

/**
 * Proves Fase 3's "referencias de fuente" end to end for a real user action
 * (not just tests): semantic search over the whole library, each result a
 * clickable citation that opens the source PDF at the right page. The full
 * Tutor chat this eventually feeds is Fase 4 — this is deliberately just
 * search, reusing the topbar input that was disabled since Fase 0.
 */
export function GlobalSearch(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<RetrievalResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const trimmed = query.trim()
    // Nothing to clear here on a short query — handleQueryChange already
    // clears results/error synchronously, right where the query shrank.
    if (trimmed.length < MIN_QUERY_LENGTH) return

    // `loading` flips inside the timeout callback, not synchronously here —
    // this both satisfies the rule against setState in an effect body and
    // avoids flashing "Buscando..." on every keystroke during the debounce.
    const timeout = setTimeout(() => {
      setLoading(true)
      window.studyos.retrieval
        .search(trimmed)
        .then((found) => {
          setResults(found)
          setError(null)
        })
        .catch((err: unknown) => setError(parseSerializedAppError(err).userMessage))
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleQueryChange(value: string): void {
    setQuery(value)
    setOpen(true)
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults(null)
      setError(null)
      setLoading(false)
    }
  }

  function handleSelect(result: RetrievalResult): void {
    setOpen(false)
    setQuery('')
    setResults(null)
    navigate(`/library/${result.documentId}?page=${result.pageStart}`)
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Buscar en tu biblioteca..."
        className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-10 z-10 max-h-80 overflow-y-auto rounded-md border border-border bg-surface-elevated shadow-lg">
          {loading && <p className="p-3 text-xs text-text-muted">Buscando...</p>}
          {!loading && error && <p className="p-3 text-xs text-danger">{error}</p>}
          {!loading && !error && results?.length === 0 && (
            <p className="p-3 text-xs text-text-muted">Sin resultados en tu biblioteca.</p>
          )}
          {!loading && !error && results && results.length > 0 && (
            <ul>
              {results.map((result) => (
                <li key={result.chunkId}>
                  <button
                    type="button"
                    onClick={() => handleSelect(result)}
                    className="block w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-surface"
                  >
                    <p className="truncate text-sm font-medium text-text-primary">
                      {result.documentTitle}
                    </p>
                    <p className="text-xs text-text-muted">
                      {result.heading ? `${result.heading} · ` : ''}
                      p.{' '}
                      {result.pageStart === result.pageEnd
                        ? result.pageStart
                        : `${result.pageStart}–${result.pageEnd}`}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{result.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
