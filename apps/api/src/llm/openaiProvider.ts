import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

export type LlmUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};

export type StructuredGeneration<T> = {
  data: T;
  usage: LlmUsage;
};

export type ReasoningEffort = "low" | "medium";

export type GenerateStructuredInput<T> = {
  step: string;
  prompt: string;
  schema: z.ZodType<T>;
  maxOutputTokens: number;
  reasoningEffort: ReasoningEffort;
};

export interface LlmProvider {
  generateStructured<T>(
    input: GenerateStructuredInput<T>,
  ): Promise<StructuredGeneration<T>>;
}

export class LlmProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "LlmProviderError";
  }
}

export class OpenAiProvider implements LlmProvider {
  private readonly client: OpenAI;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async generateStructured<T>(
    input: GenerateStructuredInput<T>,
  ): Promise<StructuredGeneration<T>> {
    let response: Awaited<ReturnType<typeof this.client.responses.parse>>;
    try {
      response = await this.client.responses.parse({
        model: this.model,
        store: false,
        input: [{ role: "user", content: input.prompt }],
        max_output_tokens: input.maxOutputTokens,
        reasoning: { effort: input.reasoningEffort },
        text: {
          format: zodTextFormat(input.schema, input.step),
        },
      });
    } catch {
      // Do not attach provider error details: they can contain request data.
      throw new LlmProviderError("OPENAI_REQUEST_FAILED", "The model request failed.");
    }

    if (response.status === "incomplete") {
      throw new LlmProviderError("OPENAI_INCOMPLETE", "The model response was incomplete.");
    }

    if (response.status !== "completed") {
      throw new LlmProviderError("OPENAI_RESPONSE_FAILED", "The model did not complete the request.");
    }

    const refused = response.output.some(
      (item) =>
        item.type === "message" &&
        item.content.some((content) => content.type === "refusal"),
    );
    if (refused) {
      throw new LlmProviderError("OPENAI_REFUSAL", "The model refused the request.");
    }

    const parsed = response.output_parsed;
    const parsedAgain = input.schema.safeParse(parsed);
    if (!parsedAgain.success) {
      throw new LlmProviderError("OPENAI_PARSE_FAILED", "The model response could not be validated.");
    }

    if (!response.usage) {
      throw new LlmProviderError("OPENAI_USAGE_MISSING", "The model response had no usage data.");
    }

    return {
      data: parsedAgain.data,
      usage: {
        inputTokens: response.usage.input_tokens,
        cachedInputTokens: response.usage.input_tokens_details.cached_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
