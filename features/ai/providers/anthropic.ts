import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  AIUnavailableError,
  type AIMessage,
  type AIProvider,
  type AIResponse,
  type ChatCompletionOptions,
  type StructuredCompletionOptions,
  type StructuredSchema,
} from "@/lib/ai/provider";

const DEFAULT_MODEL = "claude-sonnet-5";
const DEFAULT_MAX_TOKENS = 1024;

function splitSystem(messages: AIMessage[], explicitSystem?: string) {
  const embeddedSystem = messages.filter((m) => m.role === "system").map((m) => m.content);
  const system = [explicitSystem, ...embeddedSystem].filter(Boolean).join("\n\n") || undefined;
  const rest = messages
    .filter((m): m is AIMessage & { role: "user" | "assistant" } => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
  return { system, rest };
}

export class AnthropicAdapter implements AIProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AIUnavailableError("ANTHROPIC_API_KEY is not configured.");
    this.client = new Anthropic({ apiKey });
  }

  async chatCompletion(messages: AIMessage[], options?: ChatCompletionOptions): Promise<AIResponse> {
    const { system, rest } = splitSystem(messages, options?.system);
    const response = await this.client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options?.temperature,
      system,
      messages: rest,
    });
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return { content: textBlock?.text ?? "" };
  }

  async structuredCompletion<T>(
    messages: AIMessage[],
    schema: StructuredSchema,
    options?: StructuredCompletionOptions,
  ): Promise<T> {
    const { system, rest } = splitSystem(messages, options?.system);
    const response = await this.client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      system,
      messages: rest,
      tools: [
        {
          name: schema.name,
          description: schema.description,
          input_schema: schema.schema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: schema.name },
    });
    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) throw new Error("Anthropic response did not include the expected structured tool call.");
    return toolUse.input as T;
  }
}
