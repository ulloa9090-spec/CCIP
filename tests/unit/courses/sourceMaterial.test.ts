import { describe, expect, it } from 'vitest'
import { buildSourceMaterial } from '../../../src/main/courses/sourceMaterial'
import type { LibraryDocument } from '../../../src/shared/types/documents'

function fakeDocument(overrides: Partial<LibraryDocument> = {}): LibraryDocument {
  return {
    id: 'doc-1',
    title: 'Michigan Builder Manual',
    originalFilename: 'manual.pdf',
    mimeType: 'application/pdf',
    pageCount: 3,
    status: 'ready',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('buildSourceMaterial', () => {
  it('returns an empty string for no sources', () => {
    expect(buildSourceMaterial([])).toBe('')
  })

  it('includes the outline and page text for a single document', () => {
    const material = buildSourceMaterial([
      {
        document: fakeDocument(),
        outline: [{ title: 'Concrete Basics', pageNumber: 1 }],
        pages: [
          { pageNumber: 1, text: 'Concrete is a composite material.', heading: 'Concrete Basics' },
          { pageNumber: 2, text: 'Framing uses wood or steel.', heading: null }
        ]
      }
    ])

    expect(material).toContain('Michigan Builder Manual')
    expect(material).toContain('Concrete Basics (p. 1)')
    expect(material).toContain('Concrete is a composite material.')
    expect(material).toContain('Framing uses wood or steel.')
  })

  it('omits the outline section entirely when the document has no bookmarks', () => {
    const material = buildSourceMaterial([
      {
        document: fakeDocument(),
        outline: [],
        pages: [{ pageNumber: 1, text: 'texto', heading: null }]
      }
    ])

    expect(material).not.toContain('Índice:')
  })

  it('caps total output size regardless of how much page text is supplied', () => {
    const hugePages = Array.from({ length: 500 }, (_, i) => ({
      pageNumber: i + 1,
      text: 'x'.repeat(5000),
      heading: null
    }))

    const material = buildSourceMaterial([
      { document: fakeDocument(), outline: [], pages: hugePages }
    ])

    // Generous slack over the 30k budget for the "=== Documento ===" / "[p. N]" framing text.
    expect(material.length).toBeLessThan(35_000)
  })

  it('splits the character budget evenly across multiple documents', () => {
    const docA = fakeDocument({ id: 'a', title: 'Doc A' })
    const docB = fakeDocument({ id: 'b', title: 'Doc B' })
    const pages = [{ pageNumber: 1, text: 'x'.repeat(60_000), heading: null }]

    const material = buildSourceMaterial([
      { document: docA, outline: [], pages },
      { document: docB, outline: [], pages }
    ])

    expect(material).toContain('Doc A')
    expect(material).toContain('Doc B')
    expect(material.length).toBeLessThan(35_000)
  })

  it('samples pages evenly rather than only taking the first ones', () => {
    const pages = Array.from({ length: 100 }, (_, i) => ({
      pageNumber: i + 1,
      text: `unique-marker-${i + 1}`,
      heading: null
    }))

    const material = buildSourceMaterial([{ document: fakeDocument(), outline: [], pages }])

    // A page well past the first 20 must appear — a "first N pages" strategy would never include it.
    expect(material).toContain('unique-marker-51')
  })
})
