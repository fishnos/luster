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
        await throwProviderHttpError("openai", response);
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
          try {
            await throwProviderHttpError("openai", response);
          } catch (error) {
            return { ok: false, error: describeUnknownError("openai", error) };
          }
        }
        const json = (await response.json()) as OpenAIResponse;
        return { ok: true, modelEcho: json.model };
      } catch (error) {
        return { ok: false, error: describeUnknownError("openai", error) };
      }
    },
  };
}

interface OpenAIResponse {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}
