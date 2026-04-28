import type {
  Fetcher,
  ProviderCallArgs,
  ProviderCallResult,
  ProviderClient,
  ValidateKeyResult,
} from "@/core/providers/types";

const API_URL = "https://api.openai.com/v1/chat/completions";

export function createOpenAIClient(fetcher: Fetcher = fetch): ProviderClient {
  return {
    id: "openai",

    async call(args: ProviderCallArgs): Promise<ProviderCallResult> {
      const body: Record<string, unknown> = {
        model: args.model,
        max_tokens: args.maxTokens ?? 1024,
        temperature: args.temperature ?? 0.4,
        messages: [
          { role: "system", content: args.systemPrompt },
          { role: "user", content: args.userPrompt },
        ],
      };
      if (args.expectJson) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetcher(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${args.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await readErrorText(response, "openai"));
      }

      const json = (await response.json()) as OpenAIResponse;
      const text = json.choices?.[0]?.message?.content ?? "";
      const inputTokens = json.usage?.prompt_tokens ?? 0;
      const outputTokens = json.usage?.completion_tokens ?? 0;

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
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (!response.ok) {
          return { ok: false, error: await readErrorText(response, "openai") };
        }
        const json = (await response.json()) as OpenAIResponse;
        return { ok: true, modelEcho: json.model };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
  };
}

interface OpenAIResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
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
