import { describe, expect, it } from 'vitest'
import { chunkPages } from '../../../src/main/retrieval/chunkPages'
import type { DocumentPage } from '../../../src/shared/types/documents'

describe('chunkPages', () => {
  it('returns nothing for empty pages', () => {
    expect(chunkPages([])).toEqual([])
    expect(chunkPages([{ pageNumber: 1, text: '   ', heading: null }])).toEqual([])
  })

  it('keeps a short document as a single chunk carrying its page range', () => {
    const pages: DocumentPage[] = [
      { pageNumber: 1, text: 'Concrete basics.', heading: 'Concrete' },
      { pageNumber: 2, text: 'Framing overview.', heading: 'Framing' }
    ]

    const chunks = chunkPages(pages, 800, 100)

    expect(chunks).toHaveLength(1)
    expect(chunks[0].pageStart).toBe(1)
    expect(chunks[0].pageEnd).toBe(2)
    expect(chunks[0].heading).toBe('Concrete')
    expect(chunks[0].text).toContain('Concrete basics.')
    expect(chunks[0].text).toContain('Framing overview.')
  })

  it('splits long text into multiple overlapping chunks', () => {
    // ~4000 chars → well past the 800-token (~3200 char) target.
    const longText = Array.from({ length: 500 }, (_, i) => `word${i}`).join(' ')
    const pages: DocumentPage[] = [{ pageNumber: 1, text: longText, heading: null }]

    const chunks = chunkPages(pages, 800, 100)

    expect(chunks.length).toBeGreaterThan(1)
    // Overlap: the last word of chunk 0 should reappear somewhere in chunk 1.
    const lastWordOfFirstChunk = chunks[0].text.trim().split(/\s+/).at(-1)
    expect(chunks[1].text).toContain(lastWordOfFirstChunk)
  })

  it('assigns each chunk the nearest preceding heading, not a later one', () => {
    const pages: DocumentPage[] = [
      { pageNumber: 1, text: 'Intro text with no heading yet.', heading: null },
      { pageNumber: 2, text: 'Now under Concrete.', heading: 'Concrete' }
    ]

    const chunks = chunkPages(pages, 800, 100)

    expect(chunks[0].heading).toBeNull()
  })

  it('throws when overlap is not smaller than the target size', () => {
    expect(() => chunkPages([{ pageNumber: 1, text: 'x', heading: null }], 100, 100)).toThrow()
  })
})
