import { describe, expect, it, vi } from "vitest";
import { createRequestHandler } from "@/core/requestHandler";
import { createBackgroundServices } from "@/core/backgroundServices";
import { createInMemoryStorage } from "@/core/storageBackend";
import type { CommitDelta } from "@/adapters/types";
import type { DocStats } from "@/core/stats";
import type { RunModeRequest } from "@/core/messaging";

const sampleDelta: CommitDelta = {
  reason: "sentence-completed",
  sentence: "A sentence here.",
  paragraph: "A sentence here. Another sentence.",
  fullText: "A sentence here. Another sentence.",
  sentenceIndex: 0,
  paragraphIndex: 0,
};

const sampleStats: DocStats = {
  words: 4,
  sentences: 2,
  paragraphs: 1,
  characters: 30,
  avgSentenceWords: 2,
  longestSentenceWords: 2,
  fleschKincaidGrade: 1,
  passiveRatio: 0,
  repeatedOpeners: [],
  topWords: [],
};

function makeRunModeRequest(): RunModeRequest {
  return {
    type: "ai/run-mode",
    payload: {
      mode: "reading",
      delta: sampleDelta,
      stats: sampleStats,
      contextBefore: "",
      lastQuestionKind: null,
      docId: "test:doc-1",
    },
  };
}

function fetchOk(body: unknown): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

describe("createRequestHandler", () => {
  it("runs reading mode end-to-end through the wired services", async () => {
    const storage = createInMemoryStorage();
    const services = createBackgroundServices({
      storage,
      fetcher: fetchOk({
        model: "claude-sonnet-4-6",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              voiceTrend: "a",
              rhythm: "b",
              paragraphPurpose: "c",
              transitionStrength: "d",
              notes: [],
            }),
          },
        ],
        usage: { input_tokens: 12, output_tokens: 6 },
      }),
    });
    await services.keyVault.setApiKey("anthropic", "sk-ant-test");

    const handle = createRequestHandler(services);
    const response = await handle(makeRunModeRequest());

    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected ok");
    const data = response.data as { ok: true; output: { mode: string } };
    expect(data.ok).toBe(true);
    expect(data.output.mode).toBe("reading");
  });

  it("returns a no-key result when the active provider is not configured", async () => {
    const services = createBackgroundServices({
      storage: createInMemoryStorage(),
      fetcher: vi.fn() as unknown as typeof fetch,
    });
    const handle = createRequestHandler(services);
    const response = await handle(makeRunModeRequest());
    expect(response.ok).toBe(true);
    if (!response.ok) throw new Error("expected ok");
    const data = response.data as { ok: false; reason: string };
    expect(data).toMatchObject({ ok: false, reason: "no-key" });
  });

  it("saves an API key via key/save", async () => {
    const storage = createInMemoryStorage();
    const services = createBackgroundServices({
      storage,
      fetcher: vi.fn() as unknown as typeof fetch,
    });
    const handle = createRequestHandler(services);

    const response = await handle({
      type: "key/save",
      payload: { provider: "openai", apiKey: "sk-oa-real" },
    });
    expect(response.ok).toBe(true);
    expect(await services.keyVault.getApiKey("openai")).toBe("sk-oa-real");
  });

  it("persists a model override via settings/set-model", async () => {
    const services = createBackgroundServices({
      storage: createInMemoryStorage(),
      fetcher: vi.fn() as unknown as typeof fetch,
    });
    const handle = createRequestHandler(services);
    await handle({
      type: "settings/set-model",
      payload: { provider: "anthropic", model: "claude-haiku-4-5" },
    });
    expect(await services.keyVault.getModel("anthropic")).toBe(
      "claude-haiku-4-5",
    );
  });

  it("toggles history opt-in", async () => {
    const services = createBackgroundServices({
      storage: createInMemoryStorage(),
      fetcher: vi.fn() as unknown as typeof fetch,
    });
    const handle = createRequestHandler(services);

    expect(await services.historyStore.isEnabled()).toBe(false);
    await handle({ type: "history/set-enabled", payload: { enabled: true } });
    expect(await services.historyStore.isEnabled()).toBe(true);
  });

  it("returns an empty array when querying history for an unknown doc", async () => {
    const services = createBackgroundServices({
      storage: createInMemoryStorage(),
      fetcher: vi.fn() as unknown as typeof fetch,
    });
    const handle = createRequestHandler(services);
    const response = await handle({
      type: "history/get",
      payload: { docId: "doc-x" },
    });
    expect(response).toEqual({ ok: true, data: [] });
  });
});
