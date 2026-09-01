import { join } from 'path'
import { describe, expect, it, vi } from 'vitest'
import { extractPdf } from '../../../src/main/pdf/extractPdf'

const FIXTURE = join(__dirname, '../../fixtures/sample.pdf')

describe('extractPdf', () => {
  it('extracts per-page text and resolves the embedded outline to page numbers', async () => {
    const result = await extractPdf(FIXTURE)

    expect(result.pageCount).toBe(3)
    expect(result.pages).toHaveLength(3)
    expect(result.pages[0].text).toContain('Concrete Basics')
    expect(result.pages[1].text).toContain('Framing Overview')
    expect(result.pages[2].text).toContain('Electrical Fundamentals')

    expect(result.outline).toEqual([
      { title: 'Concrete Basics', pageNumber: 1 },
      { title: 'Framing Overview', pageNumber: 2 },
      { title: 'Electrical Fundamentals', pageNumber: 3 }
    ])

    // Outline titles are folded into their page's `heading` when present.
    expect(result.pages[0].heading).toBe('Concrete Basics')
  })

  it('reports progress once per extracted page', async () => {
    const onPageExtracted = vi.fn()
    await extractPdf(FIXTURE, onPageExtracted)

    expect(onPageExtracted).toHaveBeenCalledTimes(3)
    expect(onPageExtracted).toHaveBeenNthCalledWith(1, 1, 3)
    expect(onPageExtracted).toHaveBeenNthCalledWith(3, 3, 3)
  })
})
