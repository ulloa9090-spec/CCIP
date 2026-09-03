import "server-only";
import type { AIProvider, AIResponse } from "@/lib/ai/provider";

/**
 * Stub only — blueprint §C: "Local/self-hosted LLM adapter (interface
 * allows it later, not implemented now)." Exists so `AI_PROVIDER=local` (or
 * a user picking it in Settings) fails predictably with a clear message,
 * rather than silently falling through to a different provider or a
 * missing-module error.
 */
export class LocalModelAdapter implements AIProvider {
  readonly name = "local" as const;

  async chatCompletion(): Promise<AIResponse> {
    throw new Error("The local model provider is not implemented yet.");
  }

  async structuredCompletion<T>(): Promise<T> {
    throw new Error("The local model provider is not implemented yet.");
  }
}
