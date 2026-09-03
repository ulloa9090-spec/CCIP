import "server-only";

/** blueprint §M.1 — the provider abstraction every AI feature codes
 * against. No feature code ever imports an adapter or a provider SDK
 * directly; only `getAIProvider()` below does. */
export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
}

export interface ChatCompletionOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface StructuredCompletionOptions {
  system?: string;
  maxTokens?: number;
}

/** A minimal JSON-Schema description of the structured shape a
 * `structuredCompletion` call must return — forced tool-use (Anthropic) or
 * a JSON-schema response format (OpenAI) under the hood, adapter-specific. */
export interface StructuredSchema {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface AIProvider {
  readonly name: AIProviderName;
  chatCompletion(messages: AIMessage[], options?: ChatCompletionOptions): Promise<AIResponse>;
  structuredCompletion<T>(messages: AIMessage[], schema: StructuredSchema, options?: StructuredCompletionOptions): Promise<T>;
}

export type AIProviderName = "anthropic" | "openai" | "local";

export const AI_PROVIDER_NAMES: AIProviderName[] = ["anthropic", "openai", "local"];

/** Thrown by an adapter's constructor when its required API key isn't
 * configured, and by `getAIProvider()`'s callers to signal the same thing
 * up to the UI. Every AI entry point catches this and renders "AI Coach is
 * unavailable right now" (blueprint §O.7) instead of a crash. */
export class AIUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIUnavailableError";
  }
}

function isProviderName(value: string | null | undefined): value is AIProviderName {
  return !!value && (AI_PROVIDER_NAMES as string[]).includes(value);
}

/** Resolves which provider to instantiate: an explicit per-user
 * `settings.ai_provider` override (when set and valid) wins, otherwise the
 * deployment's `AI_PROVIDER` env var, otherwise `anthropic`. */
function resolveProviderName(preferredProvider?: string | null): AIProviderName {
  if (isProviderName(preferredProvider)) return preferredProvider;
  if (isProviderName(process.env.AI_PROVIDER)) return process.env.AI_PROVIDER;
  return "anthropic";
}

/** The one place a provider adapter is instantiated. Dynamic imports keep
 * the two SDKs (and their env-var requirements) out of any bundle that
 * doesn't end up needing them. Throws `AIUnavailableError` — never lets a
 * missing key surface as an unhandled exception — so every caller can
 * degrade gracefully. */
export async function getAIProvider(preferredProvider?: string | null): Promise<AIProvider> {
  const name = resolveProviderName(preferredProvider);

  switch (name) {
    case "anthropic": {
      const { AnthropicAdapter } = await import("@/features/ai/providers/anthropic");
      return new AnthropicAdapter();
    }
    case "openai": {
      const { OpenAIAdapter } = await import("@/features/ai/providers/openai");
      return new OpenAIAdapter();
    }
    case "local": {
      const { LocalModelAdapter } = await import("@/features/ai/providers/local");
      return new LocalModelAdapter();
    }
  }
}
