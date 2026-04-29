import type {
  Fetcher,
  ProviderCallArgs,
  ProviderCallResult,
  ProviderClient,
  ValidateKeyResult,
} from "@/core/providers/types";

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
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await readErrorText(response, "anthropic"));
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
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: await readErrorText(response, "anthropic"),
          };
        }
        const json = (await response.json()) as AnthropicResponse;
        return { ok: true, modelEcho: json.model };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
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

async function readErrorText(
  response: Response,
  providerLabel: string,
): Promise<string> {
  const status = `${response.status} ${response.statusText || ""}`.trim();
  try {
    const body = await response.text();
    return body
      ? `${providerLabel} ${status}: ${body}`
      : `${providerLabel} ${status}`;
  } catch {
    return `${providerLabel} ${status}`;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
