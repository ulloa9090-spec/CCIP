import type {
  AIProvider,
  AIUsage,
  GenerateStructuredOptions,
  GenerateTextOptions,
  StreamTextChunk
} from '../../shared/types/ai'
import type { DiagnosticFeature } from '../../shared/types/diagnostics'
import type { DiagnosticsRepository } from '../database/repositories/diagnosticsRepository'
import { estimateCost } from './pricing'
import { AppError } from '../../shared/types/errors'

function errorCodeOf(error: unknown): string {
  if (error instanceof AppError) return error.code
  return 'UNKNOWN_ERROR'
}

/**
 * Wraps a real `AIProvider` to record one `ai_usage_records` row per call —
 * latency, real token usage (via the provider's own `onUsage` callback),
 * and estimated cost — without any caller (TutorService, QuizService, ...)
 * having to know diagnostics exist. This is the "one central mechanism"
 * §32 of the diagnostics spec asks for, instead of every service manually
 * counting its own API calls.
 *
 * Usage recording is unconditional — the "store detailed diagnostics"
 * setting only gates prompt/question *content* (see RequestTracer), never
 * these aggregate numbers (ADR-024 / spec §16).
 */
export class InstrumentedAIProvider implements AIProvider {
  readonly id: string
  readonly model?: string

  constructor(
    private readonly inner: AIProvider,
    private readonly diagnostics: DiagnosticsRepository,
    private readonly defaultFeature: DiagnosticFeature
  ) {
    this.id = inner.id
    this.model = inner.model
  }

  testConnection(): Promise<boolean> {
    return this.inner.testConnection()
  }

  async generateText(options: GenerateTextOptions): Promise<string> {
    const start = Date.now()
    let usage: AIUsage | null = null
    try {
      const result = await this.inner.generateText({
        ...options,
        onUsage: (u) => {
          usage = u
          options.onUsage?.(u)
        }
      })
      this.record(options, start, usage, 'success', null, null)
      return result
    } catch (error) {
      this.record(options, start, usage, 'error', errorCodeOf(error), null)
      throw error
    }
  }

  async generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T> {
    const start = Date.now()
    let usage: AIUsage | null = null
    try {
      const result = await this.inner.generateStructured<T>({
        ...options,
        onUsage: (u) => {
          usage = u
          options.onUsage?.(u)
        }
      })
      this.record(options, start, usage, 'success', null, null)
      return result
    } catch (error) {
      this.record(options, start, usage, 'error', errorCodeOf(error), null)
      throw error
    }
  }

  async *streamText(options: GenerateTextOptions): AsyncIterable<StreamTextChunk> {
    const start = Date.now()
    let usage: AIUsage | null = null
    let firstTokenMs: number | null = null
    try {
      for await (const chunk of this.inner.streamText({
        ...options,
        onUsage: (u) => {
          usage = u
          options.onUsage?.(u)
        }
      })) {
        if (firstTokenMs === null && chunk.delta) firstTokenMs = Date.now() - start
        yield chunk
      }
      this.record(options, start, usage, 'success', null, firstTokenMs)
    } catch (error) {
      this.record(options, start, usage, 'error', errorCodeOf(error), firstTokenMs)
      throw error
    }
  }

  private record(
    options: GenerateTextOptions,
    start: number,
    usage: AIUsage | null,
    status: 'success' | 'error',
    errorCode: string | null,
    firstTokenMs: number | null
  ): void {
    const model = this.model ?? 'unknown'
    const cost = usage ? estimateCost(this.id, model, usage.inputTokens, usage.outputTokens) : null
    this.diagnostics.recordUsage({
      requestId: options.requestId ?? null,
      feature: (options.feature as DiagnosticFeature | undefined) ?? this.defaultFeature,
      provider: this.id,
      model,
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      estimatedCost: cost,
      status,
      errorCode,
      latencyMs: Date.now() - start,
      firstTokenMs
    })
  }
}
