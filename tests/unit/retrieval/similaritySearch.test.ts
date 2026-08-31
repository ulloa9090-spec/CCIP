import { describe, expect, it } from 'vitest'
import {
  cosineSimilarity,
  rankBySimilarity,
  type EmbeddedChunk
} from '../../../src/main/retrieval/similaritySearch'

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(
      cosineSimilarity(Float32Array.from([1, 2, 3]), Float32Array.from([1, 2, 3]))
    ).toBeCloseTo(1)
  })

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([0, 1]))).toBeCloseTo(0)
  })

  it('is -1 for opposite vectors', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([-1, 0]))).toBeCloseTo(-1)
  })

  it('is 0 for a zero-magnitude vector instead of NaN/Infinity', () => {
    expect(cosineSimilarity(Float32Array.from([0, 0]), Float32Array.from([1, 1]))).toBe(0)
  })
})

function chunk(id: string, embedding: number[]): EmbeddedChunk {
  return {
    chunkId: id,
    documentId: 'doc-1',
    documentTitle: 'Doc',
    pageStart: 1,
    pageEnd: 1,
    heading: null,
    text: `text-${id}`,
    embedding: Float32Array.from(embedding)
  }
}

describe('rankBySimilarity', () => {
  it('orders chunks by descending similarity to the query', () => {
    const query = Float32Array.from([1, 0])
    const chunks = [chunk('far', [0, 1]), chunk('exact', [1, 0]), chunk('near', [0.9, 0.1])]

    const ranked = rankBySimilarity(query, chunks)

    expect(ranked.map((c) => c.chunkId)).toEqual(['exact', 'near', 'far'])
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('respects topK', () => {
    const query = Float32Array.from([1, 0])
    const chunks = [chunk('a', [1, 0]), chunk('b', [0.9, 0]), chunk('c', [0.1, 0])]

    expect(rankBySimilarity(query, chunks, 2)).toHaveLength(2)
  })
})
