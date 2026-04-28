import type {
  Fetcher,
  ProviderCallArgs,
  ProviderCallResult,
  ProviderClient,
  ValidateKeyResult,
} from "@/core/providers/types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function createGeminiClient(fetcher: Fetcher = fetch): ProviderClient {
  return {
    id: "gemini",

    async call(args: ProviderCallArgs): Promise<ProviderCallResult> {
      const url = `${API_BASE}/${encodeURIComponent(args.model)}:generateContent?key=${encodeURIComponent(args.apiKey)}`;
      const body: Record<string, unknown> = {
        systemInstruction: {
          role: "system",
          parts: [{ text: args.systemPrompt }],
        },
        contents: [{ role: "user", parts: [{ text: args.userPrompt }] }],
        generationConfig: {
          maxOutputTokens: args.maxTokens ?? 1024,
          temperature: args.temperature ?? 0.4,
          ...(args.expectJson ? { responseMimeType: "application/json" } : {}),
        },
      };

      const response = await fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await readErrorText(response, "gemini"));
      }

      const json = (await response.json()) as GeminiResponse;
      const text = extractText(json);
      const inputTokens = json.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;

      return {
        text,
        tokens: { input: inputTokens, output: outputTokens },
        raw: json,
      };
    },

    async validateKey(apiKey, model): Promise<ValidateKeyResult> {
      try {
        const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetcher(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        });
        if (!response.ok) {
          return { ok: false, error: await readErrorText(response, "gemini") };
        }
        return { ok: true, modelEcho: model };
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
  };
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

function extractText(response: GeminiResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .filter((text) => text.length > 0)
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
