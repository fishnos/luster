import { describe, expect, it } from "vitest";
import { createKeyVault, DEFAULT_MODELS } from "@/core/keyVault";
import { createInMemoryStorage } from "@/core/storageBackend";

describe("createKeyVault", () => {
  it("stores and retrieves an API key per provider", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    expect(await vault.getApiKey("anthropic")).toBeNull();

    await vault.setApiKey("anthropic", "sk-ant-abc");
    expect(await vault.getApiKey("anthropic")).toBe("sk-ant-abc");
    expect(await vault.hasApiKey("anthropic")).toBe(true);

    await vault.setApiKey("openai", "sk-oa-xyz");
    const providers = await vault.listProvidersWithKey();
    expect(providers).toContain("anthropic");
    expect(providers).toContain("openai");
    expect(providers).not.toContain("gemini");
  });

  it("rejects empty keys", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    await expect(vault.setApiKey("gemini", "   ")).rejects.toThrow();
  });

  it("clears a stored key", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    await vault.setApiKey("anthropic", "sk-ant-abc");
    await vault.clearApiKey("anthropic");
    expect(await vault.getApiKey("anthropic")).toBeNull();
    expect(await vault.hasApiKey("anthropic")).toBe(false);
  });

  it("falls back to the default model when none is set", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    expect(await vault.getModel("anthropic")).toBe(DEFAULT_MODELS.anthropic);
    expect(await vault.getModel("openai")).toBe(DEFAULT_MODELS.openai);
    expect(await vault.getModel("gemini")).toBe(DEFAULT_MODELS.gemini);
  });

  it("persists a model override per provider", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    await vault.setModel("anthropic", "claude-haiku-4-5");
    expect(await vault.getModel("anthropic")).toBe("claude-haiku-4-5");
    expect(await vault.getModel("openai")).toBe(DEFAULT_MODELS.openai);
  });

  it("returns the per-mode default active provider when unset", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    expect(await vault.getActiveProvider("reading")).toBe("anthropic");
    expect(await vault.getActiveProvider("critic")).toBe("openai");
  });

  it("persists a per-mode active provider override", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    await vault.setActiveProvider("critic", "gemini");
    expect(await vault.getActiveProvider("critic")).toBe("gemini");
    expect(await vault.getActiveProvider("reading")).toBe("anthropic");
  });

  it("rejects an unknown active provider id", async () => {
    const vault = createKeyVault(createInMemoryStorage());
    await expect(
      vault.setActiveProvider("reading", "mystery" as any),
    ).rejects.toThrow();
  });
});
