import type { RetrievalResult } from './retrieval'

/**
 * Fase 13 (Developer Diagnostics) shared types. See docs/DECISIONS.md
 * ADR-024 for the scope decisions behind this shape — in particular, why
 * there's no numeric evidence-threshold gate here (none exists in Closed
 * Library Mode today; this phase makes the pipeline observable, it doesn't
 * add new gating behavior).
 */

export type DiagnosticFeature =
  | 'tutor'
  | 'course_generation'
  | 'assessment_generation'
  | 'flashcard_generation'
  | 'study_plan'
  | 'other'

export type DiagnosticRequestStatus = 'in_progress' | 'success' | 'aborted' | 'error'

/** Stable, machine-readable — never rely on the human-readable message alone. */
export type AbstentionReason =
  | 'NO_INDEXED_DOCUMENTS'
  | 'DOCUMENT_PROCESSING_INCOMPLETE'
  | 'NO_EMBEDDINGS'
  | 'NO_RETRIEVAL_RESULTS'
  | 'INSUFFICIENT_RETRIEVAL_SCORE'
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'AI_PROVIDER_ERROR'
  | 'AI_STREAM_ERROR'
  | 'STRUCTURED_OUTPUT_VALIDATION_FAILED'
  | 'CITATION_RECONSTRUCTION_FAILED'
  | 'UNKNOWN_ERROR'

export type DiagnosticEventType =
  | 'QUESTION_RECEIVED'
  | 'QUERY_NORMALIZED'
  | 'RETRIEVAL_STARTED'
  | 'RETRIEVAL_COMPLETED'
  | 'EVIDENCE_THRESHOLD_CHECK'
  | 'AI_REQUEST_STARTED'
  | 'AI_FIRST_TOKEN'
  | 'AI_REQUEST_COMPLETED'
  | 'CITATION_RETRIEVAL_STARTED'
  | 'CITATION_RETRIEVAL_COMPLETED'
  | 'RESPONSE_RENDERED'
  | 'REQUEST_ABORTED'
  | 'ABSTAINED'

export interface DiagnosticEvent {
  id: string
  requestId: string
  eventType: DiagnosticEventType
  occurredAt: string
  /** Milliseconds since the request started — makes the timeline trivial to render. */
  offsetMs: number
  durationMs: number | null
  metadata: Record<string, unknown> | null
}

export interface DiagnosticRequestSummary {
  id: string
  feature: DiagnosticFeature
  conversationId: string | null
  question: string | null
  status: DiagnosticRequestStatus
  abstentionReason: AbstentionReason | null
  bestSimilarityScore: number | null
  startedAt: string
  completedAt: string | null
  durationMs: number | null
}

export interface DiagnosticRequestDetail extends DiagnosticRequestSummary {
  events: DiagnosticEvent[]
  usage: AIUsageRecord[]
}

export interface AIUsageRecord {
  id: string
  requestId: string | null
  feature: DiagnosticFeature
  provider: string
  model: string
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  /** Null means "unknown pricing", never a silent $0 — see ADR-024. */
  estimatedCost: number | null
  status: 'success' | 'error'
  errorCode: string | null
  latencyMs: number | null
  firstTokenMs: number | null
  createdAt: string
}

export type UsageRange = 'today' | '7d' | '30d' | 'all'

export interface AIUsageFeatureBreakdown {
  feature: DiagnosticFeature
  requests: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number | null
}

export interface AIUsageSummary {
  range: UsageRange
  requests: number
  successful: number
  failed: number
  inputTokens: number
  outputTokens: number
  /** Sum across records with known pricing only. */
  estimatedCost: number | null
  /** How many records in this range had no pricing entry — surfaced so the total is never mistaken for complete. */
  costUnavailableCount: number
  averageLatencyMs: number | null
  averageFirstTokenMs: number | null
  byFeature: AIUsageFeatureBreakdown[]
}

export type HealthStatus = 'healthy' | 'warning' | 'error' | 'unknown'

export interface HealthCheck {
  status: HealthStatus
  label: string
  detail: string | null
}

export interface SystemHealth {
  sqlite: HealthCheck & { databaseVersion: number }
  documentEngine: HealthCheck
  embeddingEngine: HealthCheck & { model: string; dimensions: number | null }
  openAI: HealthCheck & {
    configured: boolean
    lastConnectionAt: string | null
    lastConnectionStatus: 'success' | 'error' | null
  }
  retrieval: HealthCheck & { chunksIndexed: number }
  processingQueue: HealthCheck & { pendingJobs: number }
  lastBackup: HealthCheck & { backedUpAt: string | null }
}

export interface DocumentHealthError {
  stage: string
  code: string
  message: string
}

export interface DocumentHealth {
  documentId: string
  documentTitle: string
  pages: number
  textExtraction: 'complete' | 'failed' | 'pending'
  chunks: number
  embeddingsComplete: number
  embeddingsTotal: number
  processingStatus: 'complete' | 'partial' | 'failed' | 'processing'
  processingDurationMs: number | null
  lastError: DocumentHealthError | null
}

export interface RetrievalInspectionRequest {
  query: string
  documentIds?: string[]
  topK?: number
}

export interface RetrievalInspectionResult {
  query: string
  topK: number
  results: RetrievalResult[]
  durationMs: number
  bestScore: number | null
}

export interface DiagnosticsSettings {
  /** When off, only aggregate usage metrics are kept — no question text/event metadata. */
  storeDetails: boolean
}
