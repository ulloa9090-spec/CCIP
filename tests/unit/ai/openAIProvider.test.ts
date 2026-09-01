import { beforeEach, describe, expect, it, vi } from 'vitest'

const createMock = vi.fn()
const modelsListMock = vi.fn()

vi.mock('openai', () => {
  class AuthenticationError extends Error {}
  class APIConnectionError extends Error {}
  class FakeOpenAI {
    chat = { completions: { create: createMock } }
    models = { list: modelsListMock }
  }
  return { default: FakeOpenAI, AuthenticationError, APIConnectionError }
})

vi.mock('../../../src/main/security/secretStore', () => ({
  getOpenAIKeyForUse: () => 'sk-test-key'
}))

async function drain(iterable: AsyncIterable<{ delta: string; done: boolean }>): Promise<string> {
  let full = ''
  for await (const chunk of iterable) full += chunk.delta
  return full
}

describe('OpenAIProvider', () => {
  beforeEach(() => {
    createMock.mockReset()
    modelsListMock.mockReset()
  })

  it('generateText returns the message content', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: 'hola' } }] })
    const { OpenAIProvider } = await import('../../../src/main/ai/openAIProvider')

    const result = await new OpenAIProvider().generateText({
      messages: [{ role: 'user', content: 'hi' }]
    })

    expect(result).toBe('hola')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hi' }]
      })
    )
  })

  it('streamText yields deltas from the SDK stream', async () => {
    createMock.mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: 'ho' }, finish_reason: null }] }
        yield { choices: [{ delta: { content: 'la' }, finish_reason: 'stop' }] }
      }
    })
    const { OpenAIProvider } = await import('../../../src/main/ai/openAIProvider')

    const full = await drain(
      new OpenAIProvider().streamText({ messages: [{ role: 'user', content: 'hi' }] })
    )

    expect(full).toBe('hola')
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ stream: true }))
  })

  it('generateStructured parses the JSON content', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: '{"answer":42}' } }] })
    const { OpenAIProvider } = await import('../../../src/main/ai/openAIProvider')

    const result = await new OpenAIProvider().generateStructured<{ answer: number }>({
      messages: [{ role: 'user', content: 'hi' }],
      schema: { type: 'object', properties: { answer: { type: 'number' } } }
    })

    expect(result).toEqual({ answer: 42 })
  })

  it('testConnection maps an invalid API key to a clear AppError', async () => {
    const { OpenAIProvider } = await import('../../../src/main/ai/openAIProvider')
    const openaiModule = await import('openai')
    modelsListMock.mockRejectedValue(
      new openaiModule.AuthenticationError(401, undefined, 'bad key', new Headers())
    )

    await expect(new OpenAIProvider().testConnection()).rejects.toMatchObject({
      code: 'AI_INVALID_KEY'
    })
  })

  it('maps a connection failure to a clear AppError', async () => {
    const { OpenAIProvider } = await import('../../../src/main/ai/openAIProvider')
    const openaiModule = await import('openai')
    modelsListMock.mockRejectedValue(new openaiModule.APIConnectionError({ message: 'offline' }))

    await expect(new OpenAIProvider().testConnection()).rejects.toMatchObject({
      code: 'AI_CONNECTION_FAILED'
    })
  })

  it('fails fast with a clear AppError when no API key is configured', async () => {
    vi.resetModules()
    vi.doMock('../../../src/main/security/secretStore', () => ({
      getOpenAIKeyForUse: () => null
    }))
    const { OpenAIProvider } = await import('../../../src/main/ai/openAIProvider')

    await expect(
      new OpenAIProvider().generateText({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toMatchObject({ code: 'AI_KEY_NOT_CONFIGURED' })
    expect(createMock).not.toHaveBeenCalled()
  })
})
