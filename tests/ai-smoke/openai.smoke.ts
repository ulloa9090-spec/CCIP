import { describe, expect, it } from 'vitest'
import OpenAI from 'openai'

/**
 * Real-provider verification (spec: "must never run in normal CI"). Reads
 * the key straight from the environment rather than through
 * `secretStore.ts` — that module needs Electron's `safeStorage`/`app`,
 * neither available in a bare Node/vitest process — so this deliberately
 * bypasses the app's own key storage: run it as
 * `OPENAI_API_KEY=sk-... pnpm test:ai-smoke`.
 *
 * `pnpm eval` (tests/eval/) covers everything that can be checked
 * offline/deterministically; this file exists only for what can't be:
 * whether a real request round-trips against the real API today.
 */
const apiKey = process.env.OPENAI_API_KEY

describe.skipIf(!apiKey)('AI smoke — real OpenAI connectivity', () => {
  it('completes a minimal real chat request and returns real usage', async () => {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
      max_completion_tokens: 10
    })

    expect(completion.choices[0]?.message?.content?.toLowerCase()).toContain('pong')
    expect(completion.usage?.total_tokens).toBeGreaterThan(0)
  })

  it('streams a real response with usage on the final chunk', async () => {
    const client = new OpenAI({ apiKey })
    const stream = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
      max_completion_tokens: 10,
      stream: true,
      stream_options: { include_usage: true }
    })

    let sawUsage = false
    let text = ''
    for await (const chunk of stream) {
      text += chunk.choices[0]?.delta?.content ?? ''
      if (chunk.usage) sawUsage = true
    }

    expect(text.toLowerCase()).toContain('pong')
    expect(sawUsage).toBe(true)
  })

  it('rejects an invalid key the same way OpenAIProvider expects to map it', async () => {
    const client = new OpenAI({ apiKey: 'sk-invalid-0000000000000000000000000000000000' })
    await expect(
      client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hola' }]
      })
    ).rejects.toMatchObject({ status: 401 })
  })
})

if (!apiKey) {
  // Not a failure — this suite is opt-in by design. Printed so a bare
  // `pnpm test:ai-smoke` (no key) explains itself instead of silently
  // reporting "0 tests" with no context.
  console.log(
    'AI smoke: OPENAI_API_KEY not set — skipped. Run with OPENAI_API_KEY=sk-... to execute.'
  )
}
