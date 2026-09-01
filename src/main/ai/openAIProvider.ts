import OpenAI, { AuthenticationError, APIConnectionError } from 'openai'
import { AppError } from '../../shared/types/errors'
import { getOpenAIKeyForUse } from '../security/secretStore'
import type {
  AIProvider,
  GenerateStructuredOptions,
  GenerateTextOptions,
  StreamTextChunk
} from '../../shared/types/ai'

/** Cheap, capable default — trivially swappable once a model-selection UI exists (Fase 12+). */
const DEFAULT_MODEL = 'gpt-4o-mini'

function mapError(error: unknown): AppError {
  // Already ours (e.g. getClient()'s AI_KEY_NOT_CONFIGURED) — pass through
  // unchanged instead of burying it under a generic AI_REQUEST_FAILED.
  if (error instanceof AppError) return error
  if (error instanceof AuthenticationError) {
    return new AppError({
      code: 'AI_INVALID_KEY',
      userMessage: 'Tu clave de OpenAI no es válida. Revísala en Configuración.',
      cause: error
    })
  }
  if (error instanceof APIConnectionError) {
    return new AppError({
      code: 'AI_CONNECTION_FAILED',
      userMessage: 'No se pudo conectar con OpenAI. Revisa tu conexión a internet.',
      cause: error
    })
  }
  return new AppError({
    code: 'AI_REQUEST_FAILED',
    userMessage: 'El Tutor no pudo generar una respuesta en este momento.',
    cause: error
  })
}

function getClient(): OpenAI {
  const apiKey = getOpenAIKeyForUse()
  if (!apiKey) {
    throw new AppError({
      code: 'AI_KEY_NOT_CONFIGURED',
      userMessage: 'Configura tu clave de OpenAI en Configuración > AI Provider para usar la IA.'
    })
  }
  return new OpenAI({ apiKey })
}

/**
 * Initial AIProvider implementation (MASTER_SPEC.md §14). Generation only —
 * embeddings are LocalEmbeddingProvider's job (Fase 3), never this one's.
 */
export class OpenAIProvider implements AIProvider {
  readonly id = 'openai'

  async testConnection(): Promise<boolean> {
    try {
      await getClient().models.list()
      return true
    } catch (error) {
      throw mapError(error)
    }
  }

  async generateText(options: GenerateTextOptions): Promise<string> {
    try {
      const completion = await getClient().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: options.messages,
        temperature: options.temperature,
        max_completion_tokens: options.maxOutputTokens
      })
      return completion.choices[0]?.message?.content ?? ''
    } catch (error) {
      throw mapError(error)
    }
  }

  async generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T> {
    try {
      const completion = await getClient().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: options.messages,
        temperature: options.temperature,
        max_completion_tokens: options.maxOutputTokens,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_response',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            schema: options.schema as any,
            strict: true
          }
        }
      })
      const content = completion.choices[0]?.message?.content
      if (!content) {
        throw new AppError({
          code: 'AI_EMPTY_RESPONSE',
          userMessage: 'El Tutor no devolvió una respuesta estructurada.'
        })
      }
      // Transport-level validation only (the JSON parses and matched the
      // requested JSON Schema via OpenAI's constrained decoding). Deeper
      // business validation (Zod) is the caller's job once a real schema
      // exists — see DECISIONS.md.
      return JSON.parse(content) as T
    } catch (error) {
      throw mapError(error)
    }
  }

  async *streamText(options: GenerateTextOptions): AsyncIterable<StreamTextChunk> {
    let stream
    try {
      stream = await getClient().chat.completions.create({
        model: DEFAULT_MODEL,
        messages: options.messages,
        temperature: options.temperature,
        max_completion_tokens: options.maxOutputTokens,
        stream: true
      })
    } catch (error) {
      throw mapError(error)
    }

    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? ''
        const done = chunk.choices[0]?.finish_reason != null
        if (delta || done) yield { delta, done }
      }
    } catch (error) {
      throw mapError(error)
    }
  }
}
