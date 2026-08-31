import { useEffect, useRef, useState } from 'react'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
// Vite resolves this to a same-origin asset URL at build time — same-origin
// scripts satisfy the app's `script-src 'self'` CSP without loosening it.
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Button, LoadingState } from '../../design-system'

GlobalWorkerOptions.workerSrc = pdfWorkerSrc

// pdfjs-dist (both 5.x and 6.x, verified empirically) calls the TC39
// "Upsert" proposal's `Map.prototype.getOrInsertComputed` unconditionally
// inside its render pipeline, which the Chromium bundled with Electron 39
// doesn't implement yet — `page.render()` throws before drawing anything.
// This is the standards-track polyfill, scoped to just this one method.
if (!('getOrInsertComputed' in Map.prototype)) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(Map.prototype as any).getOrInsertComputed = function <K, V>(
    this: Map<K, V>,
    key: K,
    callback: (key: K) => V
  ): V {
    if (this.has(key)) return this.get(key) as V
    const value = callback(key)
    this.set(key, value)
    return value
  }
}

interface PdfViewerProps {
  /** Render with `key={documentId}` at the call site to reset state on change. */
  documentId: string
}

export function PdfViewer({ documentId }: PdfViewerProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    window.studyos.documents.getFileBuffer(documentId).then(
      async (bytes) => {
        try {
          const pdf = await getDocument({ data: bytes }).promise
          if (cancelled) return
          pdfRef.current = pdf
          setNumPages(pdf.numPages)
        } catch {
          if (!cancelled) setError('No se pudo abrir el PDF.')
        }
      },
      () => {
        if (!cancelled) setError('No se pudo cargar el archivo.')
      }
    )

    return () => {
      cancelled = true
    }
  }, [documentId])

  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current || !numPages) return
    let cancelled = false

    pdfRef.current.getPage(pageNumber).then(async (page) => {
      if (cancelled) return
      const canvas = canvasRef.current
      if (!canvas) return
      const viewport = page.getViewport({ scale: 1.3 })
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvas, viewport }).promise
    })

    return () => {
      cancelled = true
    }
  }, [pageNumber, numPages])

  if (error) {
    return <p className="text-sm text-danger">{error}</p>
  }

  if (!numPages) {
    return <LoadingState label="Cargando documento..." />
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-surface">
        <canvas ref={canvasRef} data-testid="pdf-canvas" />
      </div>
      <div className="flex items-center gap-3 text-xs text-text-secondary">
        <Button
          size="sm"
          variant="ghost"
          disabled={pageNumber <= 1}
          onClick={() => setPageNumber((n) => n - 1)}
        >
          Anterior
        </Button>
        <span>
          Página {pageNumber} de {numPages}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={pageNumber >= numPages}
          onClick={() => setPageNumber((n) => n + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
