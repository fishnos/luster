import { describe, expect, it, vi } from "vitest";
import { createAnthropicClient } from "@/core/providers/anthropic";
import { createOpenAIClient } from "@/core/providers/openai";
import { createGeminiClient } from "@/core/providers/gemini";

type FetchMock = ReturnType<typeof makeFetchMock>;

function makeFetchMock(
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  return vi.fn(impl);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function lastCall(fetcher: FetchMock): { url: string; init: RequestInit } {
  const call = fetcher.mock.calls.at(-1);
  if (!call) throw new Error("fetcher was not called");
  const [input, init] = call;
  if (!init) throw new Error("fetcher called without init");
  return { url: typeof input === "string" ? input : String(input), init };
}

describe("createAnthropicClient", () => {
  it("posts to the Messages API with prompt-cache markers when requested", async () => {
    const fetcher = makeFetchMock(async () =>
      jsonResponse({
        model: "claude-sonnet-4-6",
        content: [{ type: "text", text: "hello" }],
        usage: {
          input_tokens: 12,
          output_tokens: 5,
          cache_read_input_tokens: 3,
        },
      }),
    );
    const client = createAnthropicClient(fetcher as unknown as typeof fetch);

    const result = await client.call({
      apiKey: "sk-ant-test",
      model: "claude-sonnet-4-6",
      systemPrompt: "editor",
      cacheableSystem: true,
      userPrompt: "analyze",
    });

    expect(result.text).toBe("hello");
    expect(result.tokens).toEqual({ input: 15, output: 5 });

    const { url, init } = lastCall(fetcher);
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body as string);
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws on a non-2xx response", async () => {
    const fetcher = makeFetchMock(
      async () =>
        new Response("bad key", { status: 401, statusText: "Unauthorized" }),
    );
    const client = createAnthropicClient(fetcher as unknown as typeof fetch);

    await expect(
      client.call({
        apiKey: "sk-ant-test",
        model: "claude-sonnet-4-6",
        systemPrompt: "s",
        userPrompt: "u",
      }),
    ).rejects.toThrow(/Claude rejected the API key/i);
  });

  it("validateKey returns ok with model echo on success", async () => {
    const fetcher = makeFetchMock(async () =>
      jsonResponse({
        model: "claude-sonnet-4-6",
        content: [{ type: "text", text: "" }],
      }),
    );
    const client = createAnthropicClient(fetcher as unknown as typeof fetch);
    const result = await client.validateKey("sk-ant-test", "claude-sonnet-4-6");
    expect(result.ok).toBe(true);
    expect(result.modelEcho).toBe("claude-sonnet-4-6");
  });

  it("validateKey returns ok=false with error text on failure", async () => {
    const fetcher = makeFetchMock(
      async () =>
        new Response("invalid api key", {
          status: 401,
          statusText: "Unauthorized",
        }),
    );
    const client = createAnthropicClient(fetcher as unknown as typeof fetch);
    const result = await client.validateKey("bad", "claude-sonnet-4-6");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Claude rejected the API key/i);
  });
});

describe("createOpenAIClient", () => {
  it("sets bearer auth and parses chat completion content", async () => {
    const fetcher = makeFetchMock(async () =>
      jsonResponse({
        model: "gpt-5-mini",
        choices: [{ message: { content: "response text" } }],
        usage: { prompt_tokens: 7, completion_tokens: 4 },
      }),
    );
    const client = createOpenAIClient(fetcher as unknown as typeof fetch);

    const result = await client.call({
      apiKey: "sk-oa-test",
      model: "gpt-5-mini",
      systemPrompt: "s",
      userPrompt: "u",
    });
    expect(result.text).toBe("response text");
    expect(result.tokens).toEqual({ input: 7, output: 4 });

    const { url, init } = lastCall(fetcher);
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer sk-oa-test");
  });

  it("forwards expectJson as response_format json_object", async () => {
    const fetcher = makeFetchMock(async () =>
      jsonResponse({
        model: "gpt-5-mini",
        choices: [{ message: { content: "{}" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    );
    const client = createOpenAIClient(fetcher as unknown as typeof fetch);
    await client.call({
      apiKey: "sk-oa-test",
      model: "gpt-5-mini",
      systemPrompt: "s",
      userPrompt: "u",
      expectJson: true,
    });
    const body = JSON.parse(lastCall(fetcher).init.body as string);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});

describe("createGeminiClient", () => {
  it("encodes the api key in the URL and parses generateContent text", async () => {
    const fetcher = makeFetchMock(async () =>
      jsonResponse({
        candidates: [{ content: { parts: [{ text: "reply" }] } }],
        usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 6 },
      }),
    );
    const client = createGeminiClient(fetcher as unknown as typeof fetch);

    const result = await client.call({
      apiKey: "gem-test",
      model: "gemini-2.5-flash",
      systemPrompt: "s",
      userPrompt: "u",
    });
    expect(result.text).toBe("reply");
    expect(result.tokens).toEqual({ input: 9, output: 6 });

    const { url } = lastCall(fetcher);
    expect(url).toContain("gemini-2.5-flash:generateContent");
    expect(url).toContain("key=gem-test");
  });

  it("forwards expectJson as responseMimeType", async () => {
    const fetcher = makeFetchMock(async () =>
      jsonResponse({
        candidates: [{ content: { parts: [{ text: "{}" }] } }],
        usageMetadata: {},
      }),
    );
    const client = createGeminiClient(fetcher as unknown as typeof fetch);
    await client.call({
      apiKey: "gem-test",
      model: "gemini-2.5-flash",
      systemPrompt: "s",
      userPrompt: "u",
      expectJson: true,
    });
    const body = JSON.parse(lastCall(fetcher).init.body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });
});
