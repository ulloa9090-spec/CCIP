import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DiagnosticsRepository } from '../../../src/main/database/repositories/diagnosticsRepository'

let db: Database.Database
let repo: DiagnosticsRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  repo = new DiagnosticsRepository(db)
})

describe('DiagnosticsRepository', () => {
  it('creates a request in_progress, then finishes it with the final outcome', () => {
    const id = repo.createRequest('tutor', 'conv-1', 'una pregunta')
    let detail = repo.getRequestDetail(id)
    expect(detail).toMatchObject({ status: 'in_progress', question: 'una pregunta' })

    repo.finishRequest(id, 'success', null, 0.83, 1200)
    detail = repo.getRequestDetail(id)
    expect(detail).toMatchObject({
      status: 'success',
      abstentionReason: null,
      bestSimilarityScore: 0.83,
      durationMs: 1200
    })
    expect(detail?.completedAt).not.toBeNull()
  })

  it('question can be null (privacy toggle off) while the request row still exists', () => {
    const id = repo.createRequest('tutor', null, null)
    expect(repo.getRequestDetail(id)).toMatchObject({ question: null, conversationId: null })
  })

  it('records events in insertion order and returns them with the request detail', () => {
    const id = repo.createRequest('tutor', null, 'q')
    repo.recordEvent(id, 'QUESTION_RECEIVED', 0, null, null)
    repo.recordEvent(id, 'RETRIEVAL_COMPLETED', 50, 20, { resultCount: 3 })

    const detail = repo.getRequestDetail(id)
    expect(detail?.events.map((e) => e.eventType)).toEqual([
      'QUESTION_RECEIVED',
      'RETRIEVAL_COMPLETED'
    ])
    expect(detail?.events[1].metadata).toEqual({ resultCount: 3 })
  })

  it('getRequestDetail returns null for an unknown id', () => {
    expect(repo.getRequestDetail('does-not-exist')).toBeNull()
  })

  it('listRequests orders newest first and can filter by feature', () => {
    const tutorId = repo.createRequest('tutor', null, 'q1')
    const otherId = repo.createRequest('course_generation', null, 'q2')

    expect(repo.listRequests(10).map((r) => r.id)).toEqual([otherId, tutorId])
    expect(repo.listRequests(10, 'tutor').map((r) => r.id)).toEqual([tutorId])
  })

  it('recordUsage attaches to a request and getRequestDetail includes it', () => {
    const requestId = repo.createRequest('tutor', null, 'q')
    repo.recordUsage({
      requestId,
      feature: 'tutor',
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      estimatedCost: 0.0004,
      status: 'success',
      errorCode: null,
      latencyMs: 900,
      firstTokenMs: 300
    })

    const detail = repo.getRequestDetail(requestId)
    expect(detail?.usage).toHaveLength(1)
    expect(detail?.usage[0]).toMatchObject({
      provider: 'openai',
      totalTokens: 140,
      status: 'success'
    })
  })

  it('getLastProviderConnection returns the most recent attempt for that provider, success or failure', () => {
    expect(repo.getLastProviderConnection('openai')).toBeNull()

    repo.recordUsage({
      requestId: null,
      feature: 'tutor',
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCost: null,
      status: 'error',
      errorCode: 'AI_CONNECTION_FAILED',
      latencyMs: 50,
      firstTokenMs: null
    })

    expect(repo.getLastProviderConnection('openai')).toMatchObject({ status: 'error' })
    expect(repo.getLastProviderConnection('anthropic')).toBeNull()
  })

  it('getUsageSummary aggregates totals, cost-unavailable counts, and a per-feature breakdown', () => {
    repo.recordUsage({
      requestId: null,
      feature: 'tutor',
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.0001,
      status: 'success',
      errorCode: null,
      latencyMs: 500,
      firstTokenMs: 200
    })
    repo.recordUsage({
      requestId: null,
      feature: 'course_generation',
      provider: 'openai',
      model: 'unknown-model',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      estimatedCost: null, // unpriced model — must never be treated as $0
      status: 'error',
      errorCode: 'AI_REQUEST_FAILED',
      latencyMs: null,
      firstTokenMs: null
    })

    const summary = repo.getUsageSummary('all')
    expect(summary.requests).toBe(2)
    expect(summary.successful).toBe(1)
    expect(summary.failed).toBe(1)
    expect(summary.estimatedCost).toBeCloseTo(0.0001, 6) // sums only known-cost rows
    expect(summary.costUnavailableCount).toBe(1)
    expect(summary.byFeature).toHaveLength(2)
    expect(
      summary.byFeature.find((f) => f.feature === 'course_generation')?.estimatedCost
    ).toBeNull()
  })

  it('getUsageSummary("today") excludes usage recorded before today', () => {
    repo.recordUsage({
      requestId: null,
      feature: 'tutor',
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      estimatedCost: 0,
      status: 'success',
      errorCode: null,
      latencyMs: 1,
      firstTokenMs: 1
    })
    db.prepare("UPDATE ai_usage_records SET created_at = '2000-01-01T00:00:00.000Z'").run()

    expect(repo.getUsageSummary('today').requests).toBe(0)
    expect(repo.getUsageSummary('all').requests).toBe(1)
  })
})
