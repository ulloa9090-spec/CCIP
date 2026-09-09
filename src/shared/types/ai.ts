/**
 * Provider contracts for StudyOS's two independent AI abstractions.
 *
 * Generation (AIProvider) and embeddings (EmbeddingProvider) are kept
 * separate on purpose: StudyOS embeds documents locally by default
 * (privacy — no chunk text leaves the machine just to be indexed) while
 * still allowing a remote model for generation, and it lets either half be
 * swapped independently (e.g. local generation later) without touching the
 * other. See docs/DECISIONS.md ADR-004 and ADR-005.
 *
 * These are type contracts only — Phase 0 ships no implementation.
 * OpenAIProvider (generation) arrives in Phase 4, LocalEmbeddingProvider
 * (embeddings) arrives in Phase 3.
 */

export interface AIProviderMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface GenerateTextOptions {
  messages: AIProviderMessage[]
  temperature?: number
  maxOutputTokens?: number
  /**
   * Fase 13 (Developer Diagnostics) instrumentation hooks — both optional
   * and additive, every existing call site is unaffected. `onUsage` lets a
   * wrapper capture real token counts straight from the provider's own
   * response instead of estimating them (see ADR-024); `requestId`/
   * `feature` let that usage be attributed to a diagnostic trace without
   * the provider needing to know what a "trace" is.
   */
  onUsage?: (usage: AIUsage) => void
  requestId?: string
  feature?: string
}

export interface GenerateStructuredOptions<T> extends GenerateTextOptions {
  /** JSON Schema (or Zod-derived schema) the response must validate against. */
  schema: unknown
  /** Type witness only; not used at runtime. */
  __resultType?: T
}

export interface StreamTextChunk {
  delta: string
  done: boolean
}

/**
 * Generative text/completions provider. Never responsible for embeddings.
 * Initial implementation: OpenAIProvider.
 */
export interface AIProvider {
  readonly id: string
  /** Fixed model identifier this provider instance talks to, if it has one — used for usage/cost attribution (Fase 13). */
  readonly model?: string
  testConnection(): Promise<boolean>
  generateText(options: GenerateTextOptions): Promise<string>
  generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T>
  streamText(options: GenerateTextOptions): AsyncIterable<StreamTextChunk>
}

/**
 * Embedding provider, decoupled from AIProvider so document indexing can run
 * fully offline. Initial implementation: LocalEmbeddingProvider (on-device
 * model, no network calls at embedding time).
 */
export interface EmbeddingProvider {
  readonly id: string
  readonly dimensions: number
  embed(texts: string[]): Promise<number[][]>
}
