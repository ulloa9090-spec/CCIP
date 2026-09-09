import Database from 'better-sqlite3'
import { beforeAll, describe, expect, it } from 'vitest'
import { runMigrations } from '../../src/main/database/migrations'
import { DocumentChunkRepository } from '../../src/main/database/repositories/documentChunkRepository'
import { RetrievalService } from '../../src/main/retrieval/retrievalService'
import { GOLDEN_QUERIES, keywordVectorEmbeddingProvider, seedGoldenLibrary } from './fixtures'

const RECALL_AT_1_MIN = 0.75 // 3 of 4 unambiguous queries, at minimum
const MRR_MIN = 0.8

interface QueryOutcome {
  id: string
  rank: number | null
  reciprocalRank: number
}

describe('Evaluation Lab — retrieval Recall@k / MRR', () => {
  let outcomes: QueryOutcome[]

  beforeAll(async () => {
    const db = new Database(':memory:')
    runMigrations(db)
    const embeddings = keywordVectorEmbeddingProvider()
    await seedGoldenLibrary(db, embeddings)
    const retrieval = new RetrievalService(new DocumentChunkRepository(db), embeddings)

    outcomes = await Promise.all(
      GOLDEN_QUERIES.map(async (golden) => {
        const results = await retrieval.search(golden.query, undefined, 6)
        const rankIndex = results.findIndex((r) => r.text.includes(golden.expectChunkText))
        const rank = rankIndex === -1 ? null : rankIndex + 1
        return { id: golden.id, rank, reciprocalRank: rank ? 1 / rank : 0 }
      })
    )
  })

  it('reports Recall@k and MRR for the golden query set', () => {
    console.table(outcomes)

    const recallAt1 = outcomes.filter((o) => o.rank === 1).length / outcomes.length
    const recallAt3 =
      outcomes.filter((o) => o.rank !== null && o.rank <= 3).length / outcomes.length
    const mrr = outcomes.reduce((sum, o) => sum + o.reciprocalRank, 0) / outcomes.length
    console.log(
      `Recall@1=${recallAt1.toFixed(2)} Recall@3=${recallAt3.toFixed(2)} MRR=${mrr.toFixed(2)}`
    )

    expect(recallAt3).toBe(1) // every golden chunk is retrievable within the top 3
    expect(recallAt1).toBeGreaterThanOrEqual(RECALL_AT_1_MIN)
    expect(mrr).toBeGreaterThanOrEqual(MRR_MIN)
  })

  it('the deliberately ambiguous query does not trivially score 100%', () => {
    const hard = outcomes.find((o) => o.id === 'Q5-hard-ambiguous')
    expect(hard?.rank).not.toBe(1)
  })
})
