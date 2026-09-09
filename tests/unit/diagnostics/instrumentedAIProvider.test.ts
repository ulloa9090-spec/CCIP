import Database from 'better-sqlite3'
import { beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../../../src/main/database/migrations'
import { DiagnosticsRepository } from '../../../src/main/database/repositories/diagnosticsRepository'
import { InstrumentedAIProvider } from '../../../src/main/diagnostics/instrumentedAIProvider'
import { AppError } from '../../../src/shared/types/errors'
import type {
  AIProvider,
  AIUsage,
  GenerateStructuredOptions,
  GenerateTextOptions,
  StreamTextChunk
} from '../../../src/shared/types/ai'

function fakeProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  return {
    id: 'openai',
    model: 'gpt-4o-mini',
    testConnection: async () => true,
    generateText: async (options: GenerateTextOptions) => {
      options.onUsage?.({ inputTokens: 10, outputTokens: 5, totalTokens: 15 })
      return 'respuesta'
    },
    generateStructured: async <T>(options: GenerateStructuredOptions<T>) => {
      options.onUsage?.({ inputTokens: 8, outputTokens: 2, totalTokens: 10 })
      return { ok: true } as T
    },
    async *streamText(options: GenerateTextOptions): AsyncIterable<StreamTextChunk> {
      yield { delta: 'a', done: false }
      options.onUsage?.({ inputTokens: 20, outputTokens: 10, totalTokens: 30 })
      yield { delta: 'b', done: true }
    },
    ...overrides
  }
}

let db: Database.Database
let diagnostics: DiagnosticsRepository

beforeEach(() => {
  db = new Database(':memory:')
  runMigrations(db)
  diagnostics = new DiagnosticsRepository(db)
})

describe('InstrumentedAIProvider', () => {
  it('exposes the wrapped provider id/model unchanged', () => {
    const wrapped = new InstrumentedAIProvider(fakeProvider(), diagnostics, 'tutor')
    expect(wrapped.id).toBe('openai')
    expect(wrapped.model).toBe('gpt-4o-mini')
  })

  it('records real usage (never estimated) and cost from generateText, attributed to the request/feature', async () => {
    const wrapped = new InstrumentedAIProvider(fakeProvider(), diagnostics, 'tutor')
    const requestId = diagnostics.createRequest('tutor', null, 'q')

    await wrapped.generateText({ messages: [], requestId, feature: 'tutor' })

    const detail = diagnostics.getRequestDetail(requestId)
    expect(detail?.usage).toHaveLength(1)
    expect(detail?.usage[0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-4o-mini',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      status: 'success'
    })
    // gpt-4o-mini: $0.15/$0.6 per million -> 10*0.15e-6 + 5*0.6e-6
    expect(detail?.usage[0].estimatedCost).toBeCloseTo(10 * 0.15e-6 + 5 * 0.6e-6, 12)
  })

  it('falls back to the constructor default feature when the call omits one', async () => {
    const wrapped = new InstrumentedAIProvider(fakeProvider(), diagnostics, 'course_generation')
    await wrapped.generateText({ messages: [] })

    const summary = diagnostics.getUsageSummary('all')
    expect(summary.byFeature.map((f) => f.feature)).toEqual(['course_generation'])
  })

  it('records a failed call with its error code and null usage, and still rethrows', async () => {
    const failing = fakeProvider({
      generateText: async () => {
        throw new AppError({ code: 'AI_INVALID_KEY', userMessage: 'clave inválida' })
      }
    })
    const wrapped = new InstrumentedAIProvider(failing, diagnostics, 'tutor')

    await expect(wrapped.generateText({ messages: [] })).rejects.toThrow('clave inválida')

    const summary = diagnostics.getUsageSummary('all')
    expect(summary.requests).toBe(1)
    expect(summary.failed).toBe(1)

    const row = db
      .prepare('SELECT error_code, input_tokens, output_tokens FROM ai_usage_records')
      .get() as { error_code: string; input_tokens: number | null; output_tokens: number | null }
    expect(row).toEqual({ error_code: 'AI_INVALID_KEY', input_tokens: null, output_tokens: null })
  })

  it('records first-token latency and final usage for a streamed response', async () => {
    const wrapped = new InstrumentedAIProvider(fakeProvider(), diagnostics, 'tutor')
    const requestId = diagnostics.createRequest('tutor', null, 'q')

    const chunks: string[] = []
    for await (const chunk of wrapped.streamText({ messages: [], requestId, feature: 'tutor' })) {
      chunks.push(chunk.delta)
    }

    expect(chunks).toEqual(['a', 'b'])
    const detail = diagnostics.getRequestDetail(requestId)
    expect(detail?.usage[0]).toMatchObject({ totalTokens: 30, status: 'success' })
    expect(detail?.usage[0].firstTokenMs).not.toBeNull()
  })

  it('generateStructured records usage under the "structured" call path too', async () => {
    const wrapped = new InstrumentedAIProvider(fakeProvider(), diagnostics, 'tutor')
    await wrapped.generateStructured({ messages: [], schema: {} })

    const summary = diagnostics.getUsageSummary('all')
    expect(summary.requests).toBe(1)
    expect(summary.inputTokens).toBe(8)
  })

  it('an unknown model records the call with a null (never fabricated) cost', async () => {
    const noModel = fakeProvider({ model: undefined })
    const wrapped = new InstrumentedAIProvider(noModel, diagnostics, 'tutor')
    await wrapped.generateText({ messages: [] })

    const summary = diagnostics.getUsageSummary('all')
    expect(summary.estimatedCost).toBeNull()
    expect(summary.costUnavailableCount).toBe(1)
  })

  it('threads the caller-supplied onUsage callback through unchanged', async () => {
    const wrapped = new InstrumentedAIProvider(fakeProvider(), diagnostics, 'tutor')
    let seen: AIUsage | undefined
    await wrapped.generateText({ messages: [], onUsage: (u) => (seen = u) })
    expect(seen).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15 })
  })
})
