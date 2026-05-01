import type {
  Fetcher,
  ProviderCallArgs,
  ProviderCallResult,
  ProviderClient,
  ValidateKeyResult,
} from "@/core/providers/types";
import {
  describeUnknownError,
  throwProviderHttpError,
} from "@/core/providers/errors";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export function createAnthropicClient(
  fetcher: Fetcher = fetch,
): ProviderClient {
  return {
    id: "anthropic",

    async call(args: ProviderCallArgs): Promise<ProviderCallResult> {
      const systemBlocks = args.cacheableSystem
        ? [
            {
              type: "text",
              text: args.systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ]
        : [{ type: "text", text: args.systemPrompt }];

      const messages: Array<Record<string, unknown>> = [
        {
          role: "user",
          content: [{ type: "text", text: args.userPrompt }],
        },
      ];
      if (args.expectJson) {
        messages.push({
          role: "assistant",
          content: [{ type: "text", text: "{" }],
        });
      }

      const body: Record<string, unknown> = {
        model: args.model,
        max_tokens: args.maxTokens ?? 1024,
        temperature: args.temperature ?? 0.4,
        system: systemBlocks,
        messages,
      };

      const response = await fetcher(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": args.apiKey,
          "anthropic-version": API_VERSION,
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        await throwProviderHttpError("anthropic", response);
      }

      const json = (await response.json()) as AnthropicResponse;
      const rawText = extractText(json);
      const text = args.expectJson ? `{${rawText}` : rawText;
      const inputTokens =
        (json.usage?.input_tokens ?? 0) +
        (json.usage?.cache_read_input_tokens ?? 0) +
        (json.usage?.cache_creation_input_tokens ?? 0);
      const outputTokens = json.usage?.output_tokens ?? 0;

      return {
        text,
        tokens: { input: inputTokens, output: outputTokens },
        raw: json,
      };
    },

    async validateKey(apiKey, model): Promise<ValidateKeyResult> {
      try {
        const response = await fetcher(API_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": API_VERSION,
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (!response.ok) {
          try {
            await throwProviderHttpError("anthropic", response);
          } catch (error) {
            return {
              ok: false,
              error: describeUnknownError("anthropic", error),
            };
          }
        }
        const json = (await response.json()) as AnthropicResponse;
        return { ok: true, modelEcho: json.model };
      } catch (error) {
        return { ok: false, error: describeUnknownError("anthropic", error) };
      }
    },
  };
}

interface AnthropicResponse {
  model?: string;
  content?: { type: string; text?: string }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

function extractText(response: AnthropicResponse): string {
  if (!response.content) return "";
  return response.content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text!)
    .join("");
}
