import { describe, expect, it, vi } from "vitest";
import { createAiClient, type ProviderRegistry } from "@/core/aiClient";
import { createKeyVault } from "@/core/keyVault";
import { createInMemoryStorage } from "@/core/storageBackend";
import { createRateLimiter } from "@/core/rateLimiter";
import type { ProviderClient } from "@/core/providers/types";

function fakeProvider(
  id: ProviderClient["id"],
  textOut = "ok",
): ProviderClient {
  return {
    id,
    call: vi.fn(async () => ({
      text: textOut,
      tokens: { input: 4, output: 2 },
    })),
    validateKey: vi.fn(async () => ({ ok: true, modelEcho: "mock-model" })),
  };
}

function makeRegistry(): ProviderRegistry {
  return {
    anthropic: fakeProvider("anthropic", "anthropic-text"),
    openai: fakeProvider("openai", "openai-text"),
    gemini: fakeProvider("gemini", "gemini-text"),
  };
}

describe("createAiClient.runForMode", () => {
  it("routes through the active provider when a key is set", async () => {
    const storage = createInMemoryStorage();
    const keyVault = createKeyVault(storage);
    await keyVault.setApiKey("anthropic", "sk-ant");

    const rateLimiter = createRateLimiter({ defaultCallsPerMinute: 10 });
    const providers = makeRegistry();
    const client = createAiClient({ keyVault, rateLimiter, providers });

    const result = await client.runForMode({
      mode: "reading",
      systemPrompt: "system",
      userPrompt: "user",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.provider).toBe("anthropic");
    expect(result.text).toBe("anthropic-text");
    expect(providers.anthropic.call).toHaveBeenCalledTimes(1);
  });

  it("returns no-key when the active provider has no API key", async () => {
    const keyVault = createKeyVault(createInMemoryStorage());
    const rateLimiter = createRateLimiter({ defaultCallsPerMinute: 10 });
    const client = createAiClient({
      keyVault,
      rateLimiter,
      providers: makeRegistry(),
    });

    const result = await client.runForMode({
      mode: "reading",
      systemPrompt: "system",
      userPrompt: "user",
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "no-key",
      provider: "anthropic",
    });
  });

  it("returns rate-limited with a retry hint when the bucket is full", async () => {
    const keyVault = createKeyVault(createInMemoryStorage());
    await keyVault.setApiKey("anthropic", "sk-ant");
    const rateLimiter = createRateLimiter({ defaultCallsPerMinute: 1 });
    const providers = makeRegistry();
    const client = createAiClient({ keyVault, rateLimiter, providers });

    await client.runForMode({
      mode: "reading",
      systemPrompt: "s",
      userPrompt: "u",
    });
    const blocked = await client.runForMode({
      mode: "reading",
      systemPrompt: "s",
      userPrompt: "u",
    });
    expect(blocked).toMatchObject({ ok: false, reason: "rate-limited" });
    if (blocked.ok) throw new Error("expected failure");
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(providers.anthropic.call).toHaveBeenCalledTimes(1);
  });

  it("reports provider-error when the provider call throws", async () => {
    const keyVault = createKeyVault(createInMemoryStorage());
    await keyVault.setApiKey("anthropic", "sk-ant");
    const rateLimiter = createRateLimiter({ defaultCallsPerMinute: 10 });
    const providers = makeRegistry();
    providers.anthropic.call = vi.fn(async () => {
      throw new Error("upstream blew up");
    });
    const client = createAiClient({ keyVault, rateLimiter, providers });

    const result = await client.runForMode({
      mode: "reading",
      systemPrompt: "s",
      userPrompt: "u",
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "provider-error",
      error: "upstream blew up",
    });
  });

  it("honors a per-mode active provider override", async () => {
    const keyVault = createKeyVault(createInMemoryStorage());
    await keyVault.setApiKey("gemini", "gem-key");
    await keyVault.setActiveProvider("critic", "gemini");
    const rateLimiter = createRateLimiter({ defaultCallsPerMinute: 10 });
    const providers = makeRegistry();
    const client = createAiClient({ keyVault, rateLimiter, providers });

    const result = await client.runForMode({
      mode: "critic",
      systemPrompt: "s",
      userPrompt: "u",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.provider).toBe("gemini");
    expect(providers.gemini.call).toHaveBeenCalledTimes(1);
    expect(providers.openai.call).not.toHaveBeenCalled();
  });

  it("forwards validateKey to the named provider with its configured model", async () => {
    const keyVault = createKeyVault(createInMemoryStorage());
    await keyVault.setModel("openai", "gpt-5-mini");
    const rateLimiter = createRateLimiter({ defaultCallsPerMinute: 10 });
    const providers = makeRegistry();
    const client = createAiClient({ keyVault, rateLimiter, providers });

    const validation = await client.validateKey("openai", "sk-oa-test");
    expect(validation.ok).toBe(true);
    expect(providers.openai.validateKey).toHaveBeenCalledWith(
      "sk-oa-test",
      "gpt-5-mini",
    );
  });
});
