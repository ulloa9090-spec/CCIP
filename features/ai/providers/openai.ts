import "server-only";
import OpenAI from "openai";
import {
  AIUnavailableError,
  type AIMessage,
  type AIProvider,
  type AIResponse,
  type ChatCompletionOptions,
  type StructuredCompletionOptions,
  type StructuredSchema,
} from "@/lib/ai/provider";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 1024;

function toChatMessages(
  messages: AIMessage[],
  explicitSystem?: string,
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (explicitSystem) result.push({ role: "system", content: explicitSystem });
  for (const m of messages) result.push({ role: m.role, content: m.content });
  return result;
}

export class OpenAIAdapter implements AIProvider {
  readonly name = "openai" as const;
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new AIUnavailableError("OPENAI_API_KEY is not configured.");
    this.client = new OpenAI({ apiKey });
  }

  async chatCompletion(messages: AIMessage[], options?: ChatCompletionOptions): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options?.temperature,
      messages: toChatMessages(messages, options?.system),
    });
    return { content: response.choices[0]?.message?.content ?? "" };
  }

  async structuredCompletion<T>(
    messages: AIMessage[],
    schema: StructuredSchema,
    options?: StructuredCompletionOptions,
  ): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: toChatMessages(messages, options?.system),
      response_format: {
        type: "json_schema",
        json_schema: { name: schema.name, description: schema.description, schema: schema.schema, strict: true },
      },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error("OpenAI response did not include the expected structured output.");
    return JSON.parse(raw) as T;
  }
}
