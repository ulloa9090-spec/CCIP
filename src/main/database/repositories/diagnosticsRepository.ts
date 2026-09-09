import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type {
  AbstentionReason,
  AIUsageFeatureBreakdown,
  AIUsageRecord,
  AIUsageSummary,
  DiagnosticEvent,
  DiagnosticEventType,
  DiagnosticFeature,
  DiagnosticRequestDetail,
  DiagnosticRequestStatus,
  DiagnosticRequestSummary,
  UsageRange
} from '../../../shared/types/diagnostics'

interface RequestRow {
  id: string
  feature: DiagnosticFeature
  conversation_id: string | null
  question: string | null
  status: DiagnosticRequestStatus
  abstention_reason: AbstentionReason | null
  best_similarity_score: number | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

interface EventRow {
  id: string
  request_id: string
  event_type: DiagnosticEventType
  occurred_at: string
  offset_ms: number
  duration_ms: number | null
  metadata_json: string | null
}

interface UsageRow {
  id: string
  request_id: string | null
  feature: DiagnosticFeature
  provider: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost: number | null
  status: 'success' | 'error'
  error_code: string | null
  latency_ms: number | null
  first_token_ms: number | null
  created_at: string
}

function mapRequest(row: RequestRow): DiagnosticRequestSummary {
  return {
    id: row.id,
    feature: row.feature,
    conversationId: row.conversation_id,
    question: row.question,
    status: row.status,
    abstentionReason: row.abstention_reason,
    bestSimilarityScore: row.best_similarity_score,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms
  }
}

function mapEvent(row: EventRow): DiagnosticEvent {
  return {
    id: row.id,
    requestId: row.request_id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    offsetMs: row.offset_ms,
    durationMs: row.duration_ms,
    metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : null
  }
}

function mapUsage(row: UsageRow): AIUsageRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    feature: row.feature,
    provider: row.provider,
    model: row.model,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    estimatedCost: row.estimated_cost,
    status: row.status,
    errorCode: row.error_code,
    latencyMs: row.latency_ms,
    firstTokenMs: row.first_token_ms,
    createdAt: row.created_at
  }
}

function rangeStart(range: UsageRange, now: Date): string | null {
  if (range === 'all') return null
  const start = new Date(now)
  if (range === 'today') {
    start.setUTCHours(0, 0, 0, 0)
  } else if (range === '7d') {
    start.setUTCDate(start.getUTCDate() - 7)
  } else {
    start.setUTCDate(start.getUTCDate() - 30)
  }
  return start.toISOString()
}

/**
 * Persists Fase 13's diagnostic traces — one `diagnostic_requests` row per
 * traced pipeline run (currently just Tutor questions), a `diagnostic_events`
 * row per pipeline stage, and one `ai_usage_records` row per real (or
 * attempted) AI provider call. See docs/DECISIONS.md ADR-024.
 */
export class DiagnosticsRepository {
  constructor(private readonly db: Database) {}

  createRequest(
    feature: DiagnosticFeature,
    conversationId: string | null,
    question: string | null
  ): string {
    const id = ulid()
    this.db
      .prepare(
        `INSERT INTO diagnostic_requests
           (id, feature, conversation_id, question, status, abstention_reason, best_similarity_score, started_at, completed_at, duration_ms)
         VALUES (?, ?, ?, ?, 'in_progress', NULL, NULL, ?, NULL, NULL)`
      )
      .run(id, feature, conversationId, question, new Date().toISOString())
    return id
  }

  recordEvent(
    requestId: string,
    eventType: DiagnosticEventType,
    offsetMs: number,
    durationMs: number | null,
    metadata: Record<string, unknown> | null
  ): void {
    this.db
      .prepare(
        `INSERT INTO diagnostic_events (id, request_id, event_type, occurred_at, offset_ms, duration_ms, metadata_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ulid(),
        requestId,
        eventType,
        new Date().toISOString(),
        offsetMs,
        durationMs,
        metadata ? JSON.stringify(metadata) : null
      )
  }

  finishRequest(
    requestId: string,
    status: DiagnosticRequestStatus,
    abstentionReason: AbstentionReason | null,
    bestSimilarityScore: number | null,
    durationMs: number
  ): void {
    this.db
      .prepare(
        `UPDATE diagnostic_requests
         SET status = ?, abstention_reason = ?, best_similarity_score = ?, completed_at = ?, duration_ms = ?
         WHERE id = ?`
      )
      .run(
        status,
        abstentionReason,
        bestSimilarityScore,
        new Date().toISOString(),
        durationMs,
        requestId
      )
  }

  recordUsage(record: {
    requestId: string | null
    feature: DiagnosticFeature
    provider: string
    model: string
    inputTokens: number | null
    outputTokens: number | null
    totalTokens: number | null
    estimatedCost: number | null
    status: 'success' | 'error'
    errorCode: string | null
    latencyMs: number | null
    firstTokenMs: number | null
  }): void {
    this.db
      .prepare(
        `INSERT INTO ai_usage_records
           (id, request_id, feature, provider, model, input_tokens, output_tokens, total_tokens, estimated_cost, status, error_code, latency_ms, first_token_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ulid(),
        record.requestId,
        record.feature,
        record.provider,
        record.model,
        record.inputTokens,
        record.outputTokens,
        record.totalTokens,
        record.estimatedCost,
        record.status,
        record.errorCode,
        record.latencyMs,
        record.firstTokenMs,
        new Date().toISOString()
      )
  }

  getRequestDetail(id: string): DiagnosticRequestDetail | null {
    const row = this.db.prepare('SELECT * FROM diagnostic_requests WHERE id = ?').get(id) as
      RequestRow | undefined
    if (!row) return null

    const eventRows = this.db
      .prepare(
        'SELECT * FROM diagnostic_events WHERE request_id = ? ORDER BY offset_ms ASC, id ASC'
      )
      .all(id) as EventRow[]
    const usageRows = this.db
      .prepare('SELECT * FROM ai_usage_records WHERE request_id = ? ORDER BY created_at ASC')
      .all(id) as UsageRow[]

    return {
      ...mapRequest(row),
      events: eventRows.map(mapEvent),
      usage: usageRows.map(mapUsage)
    }
  }

  listRequests(limit: number, feature?: DiagnosticFeature): DiagnosticRequestSummary[] {
    const rows = feature
      ? (this.db
          .prepare(
            'SELECT * FROM diagnostic_requests WHERE feature = ? ORDER BY started_at DESC, id DESC LIMIT ?'
          )
          .all(feature, limit) as RequestRow[])
      : (this.db
          .prepare('SELECT * FROM diagnostic_requests ORDER BY started_at DESC, id DESC LIMIT ?')
          .all(limit) as RequestRow[])
    return rows.map(mapRequest)
  }

  /** For System Health — the most recent real attempt to reach the AI provider, success or failure. */
  getLastProviderConnection(provider: string): { at: string; status: 'success' | 'error' } | null {
    const row = this.db
      .prepare(
        'SELECT status, created_at FROM ai_usage_records WHERE provider = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(provider) as { status: 'success' | 'error'; created_at: string } | undefined
    return row ? { at: row.created_at, status: row.status } : null
  }

  getUsageSummary(range: UsageRange): AIUsageSummary {
    const since = rangeStart(range, new Date())
    const rows = (
      since
        ? this.db.prepare('SELECT * FROM ai_usage_records WHERE created_at >= ?').all(since)
        : this.db.prepare('SELECT * FROM ai_usage_records').all()
    ) as UsageRow[]

    const successful = rows.filter((row) => row.status === 'success')
    const failed = rows.filter((row) => row.status === 'error')
    const withCost = rows.filter((row) => row.estimated_cost !== null)
    const withLatency = successful.filter((row) => row.latency_ms !== null)
    const withFirstToken = successful.filter((row) => row.first_token_ms !== null)

    const byFeatureMap = new Map<DiagnosticFeature, AIUsageFeatureBreakdown>()
    for (const row of rows) {
      const existing = byFeatureMap.get(row.feature)
      const cost = existing?.estimatedCost ?? null
      const rowCost = row.estimated_cost
      byFeatureMap.set(row.feature, {
        feature: row.feature,
        requests: (existing?.requests ?? 0) + 1,
        inputTokens: (existing?.inputTokens ?? 0) + (row.input_tokens ?? 0),
        outputTokens: (existing?.outputTokens ?? 0) + (row.output_tokens ?? 0),
        estimatedCost: rowCost === null ? cost : (cost ?? 0) + rowCost
      })
    }

    return {
      range,
      requests: rows.length,
      successful: successful.length,
      failed: failed.length,
      inputTokens: rows.reduce((sum, row) => sum + (row.input_tokens ?? 0), 0),
      outputTokens: rows.reduce((sum, row) => sum + (row.output_tokens ?? 0), 0),
      estimatedCost:
        withCost.length > 0
          ? withCost.reduce((sum, row) => sum + (row.estimated_cost ?? 0), 0)
          : null,
      costUnavailableCount: rows.length - withCost.length,
      averageLatencyMs:
        withLatency.length > 0
          ? Math.round(
              withLatency.reduce((sum, row) => sum + (row.latency_ms ?? 0), 0) / withLatency.length
            )
          : null,
      averageFirstTokenMs:
        withFirstToken.length > 0
          ? Math.round(
              withFirstToken.reduce((sum, row) => sum + (row.first_token_ms ?? 0), 0) /
                withFirstToken.length
            )
          : null,
      byFeature: [...byFeatureMap.values()]
    }
  }
}
