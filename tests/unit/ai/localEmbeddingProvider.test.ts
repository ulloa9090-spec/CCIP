import { beforeEach, describe, expect, it, vi } from 'vitest'

const pipelineMock = vi.fn()

vi.mock('@huggingface/transformers', () => ({
  pipeline: (...args: unknown[]) => pipelineMock(...args)
}))

describe('LocalEmbeddingProvider', () => {
  beforeEach(() => {
    pipelineMock.mockReset()
    vi.resetModules()
  })

  it('requests the wasm device explicitly (not the native onnxruntime-node default)', async () => {
    pipelineMock.mockResolvedValue(vi.fn().mockResolvedValue({ tolist: () => [[1, 0, 0, 0]] }))
    const { LocalEmbeddingProvider } = await import('../../../src/main/ai/localEmbeddingProvider')

    await new LocalEmbeddingProvider().embed(['hola'])

    expect(pipelineMock).toHaveBeenCalledWith(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      expect.objectContaining({ device: 'wasm' })
    )
  })

  it('returns an empty array without loading the model for an empty input', async () => {
    const { LocalEmbeddingProvider } = await import('../../../src/main/ai/localEmbeddingProvider')

    expect(await new LocalEmbeddingProvider().embed([])).toEqual([])
    expect(pipelineMock).not.toHaveBeenCalled()
  })

  it('loads the pipeline only once across multiple embed calls', async () => {
    const extractor = vi.fn().mockResolvedValue({ tolist: () => [[1, 0, 0, 0]] })
    pipelineMock.mockResolvedValue(extractor)
    const { LocalEmbeddingProvider } = await import('../../../src/main/ai/localEmbeddingProvider')

    const provider = new LocalEmbeddingProvider()
    await provider.embed(['a'])
    await provider.embed(['b'])

    expect(pipelineMock).toHaveBeenCalledTimes(1)
    expect(extractor).toHaveBeenCalledTimes(2)
  })

  it('wraps a failed model load as a clear, user-facing AppError and allows retrying', async () => {
    pipelineMock.mockRejectedValueOnce(new Error('Forbidden access to file: config.json'))
    const { LocalEmbeddingProvider } = await import('../../../src/main/ai/localEmbeddingProvider')
    const { AppError } = await import('../../../src/shared/types/errors')

    const provider = new LocalEmbeddingProvider()
    let caught: unknown
    try {
      await provider.embed(['a'])
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(AppError)
    expect(caught).toMatchObject({ code: 'EMBEDDING_MODEL_UNAVAILABLE' })

    // Retry on the next call, rather than caching the rejection forever.
    pipelineMock.mockResolvedValue(vi.fn().mockResolvedValue({ tolist: () => [[1, 0, 0, 0]] }))
    await expect(provider.embed(['a'])).resolves.toEqual([[1, 0, 0, 0]])
  })
})
