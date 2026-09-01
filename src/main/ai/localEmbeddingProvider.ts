import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { AppError } from '../../shared/types/errors'
import type { EmbeddingProvider } from '../../shared/types/ai'
import { logger } from '../logging/logger'

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
const DIMENSIONS = 384

/**
 * Embeds text entirely on-device (DECISIONS.md ADR-005): no document chunk
 * is ever sent anywhere just to index it. `device: 'wasm'` is explicit and
 * load-bearing — @huggingface/transformers defaults to the native
 * `onnxruntime-node` backend under Node (verified by reading its source),
 * which would reintroduce exactly the second-native-module packaging risk
 * ADR-005 chose WASM to avoid. Forcing 'wasm' was confirmed empirically to
 * skip that native path entirely (it fails at the network boundary instead,
 * inside this sandboxed session — see ADR-012).
 *
 * The model (~90MB, quantized) downloads from Hugging Face on first use and
 * is cached by the library afterwards; no network call happens once cached.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly id = 'local-minilm-l6-v2'
  readonly dimensions = DIMENSIONS

  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null

  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = pipeline('feature-extraction', MODEL_ID, { device: 'wasm' }).catch(
        (error: unknown) => {
          this.pipelinePromise = null // allow retry on the next call
          logger.error('Failed to load local embedding model', {
            message: error instanceof Error ? error.message : String(error)
          })
          throw new AppError({
            code: 'EMBEDDING_MODEL_UNAVAILABLE',
            userMessage:
              'No se pudo cargar el modelo de embeddings locales. La primera vez necesitas conexión a internet para descargarlo.',
            cause: error
          })
        }
      )
    }
    return this.pipelinePromise
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const extractor = await this.getPipeline()
    const output = await extractor(texts, { pooling: 'mean', normalize: true })
    return output.tolist() as number[][]
  }
}
